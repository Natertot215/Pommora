### Trash & Archive Restructure — Brief

**DATE:** 10-29-2026
**STATUS:** Planning, headless until the full plan is presented to Nathan

The continuation record for this work: what it is, what governs it, what Nathan wants, and where the process stands, so a session picking it up after a compaction loses nothing. *§Resume* is the one section that changes as the work moves.

#### Context

The Trash & Archive Restructure moves the Trash onto the Archive's reach-in model and folds what the two models duplicated into one design, removal first, with the landing's one flush per group and the change-time identity as its first phase. Its decisions are ratified (*Trash & Archive Restructure — Decisions & Intention*, A-1–G-4); *Trash & Archive Restructure — Investigation* holds the design at HEAD, refreshed from six scouts (`Scouts/1-6`), with *§The Plan's Shape* proposing six phases; *Trash & Archive Restructure — Implementation Plan* is being written from them. The Write Path plan, run first, is complete (`15fe7422a..58a7b41a6`).

#### Mandate (Nathan, Verbatim)

The plan's *§Constraints · Mandate* holds the Approach and the Principles verbatim; every agent brief on this topic (scouts, drafters, executors, reviewers) carries both in full, read from there or from *Decisions & Intention · §Constraints*.

#### What Nathan Wants Held Throughout

- **The Measure:** the Approach, the Principles, and net-less weigh every decision for the whole system; anything made bigger is justified by them. Net-negative lines are the north star, and "less" counts mechanisms, files, types, branches, tests, and docs too (Decision A-7).
- **The Decisions Are the What:** the decision log holds the "what" and the rough "how", not a contract. A "how" that isn't the core of the feature changes when another way produces the cleaner outcome and there's reason for it, stated where the plan departs.
- **Comments and Docs:** the codebase's comment count doesn't grow. Documentation changes are minimal re-wordings where a claim turns false, net-less where possible.
- **Obvious Folds:** included without asking where his answer to "fix it here" would be yes and there's no architectural risk or domino effect.
- **His Weigh-Ins:** anything needing him is decided within the hour if it can be, and otherwise planned without and recorded for him; his messages during the work are input, never a stop.
- **Headless:** planning runs to the presented plan without stopping; execution, once ratified, runs to the report.
- **Talking to Him:** plain, non-technical words; never a bare code (an ID, a bug number, a decision letter) without saying what it is; explain changes as if to a fresh non-technical reader, covering how they reduce the codebase, raise efficiency, cut duplication, and serve the Approach and Principles. He's in character with sarcasm and directness, and wants honest pushback.
- **Notifications:** a push notification (`PushNotification`) at each checkpoint and with each update.
- **Runs:** short; a measurement covers only the cells a decision rests on.
- **No Hand Checks:** every live check is an agent's CDP drive on a scratch copy of `~/Test` from a worktree build; the app is never launched from the main checkout, where his instance runs.
- **Placements:** approved 10-29-2026 and listed in the plan's *§Constraints · Placements*; no other file is created, moved, renamed, or deleted.
- **The Dashboard:** during the final two-wave closeout, one extra agent per lens maps how the Studio dashboard's Pommora count would divide so Trash & Archive is its own section; the map goes to him, the dashboard unchanged.

#### Operational Rules

- **Git:** a Bash command carrying `git` can't contain the personal name, the home path included: `cd` into the repo in its own command, then relative paths; commit with `git commit --only` (after `git add` for new files); messages past tense, one to three sentences, ending `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, and never naming him.
- **Agents:** every agent gets an explicit model and effort (`agent-orchestration`), keeps scratch in its own scratchpad subfolder, and deletes only that; a subagent's report write may be refused, in which case it returns the text and the orchestrator saves it.
- **Never:** `npm install` or `npm uninstall` in the main checkout; launching the app from it.

#### Resume

1. **Wave A (done):** `Drafts/Phase-1.md` (about +49), `Phase-2.md` (about −135), and `Phase-4.md` (about −455), drafted from the shared brief (the session scratchpad's `plan/brief-common.md`: the format, the rules, the owner's standing rules, the report).
   - **Calls for the consistency pass:** drop Phase 1's LD-8 (remint as one held rewrite, +12 for a rare open-time path, against net-less) and keep remint serial with its reason; keep the Write Path plan's Deviation D-4 as the record it is; Decision G-2's opening measurement isn't carried, since its before is on record; break Phase 4's `exclusion.ts` ↔ `bundleLayout.ts` import cycle by moving `hiddenName` and `hiddenFolder` into `Core/Paths/nexusPaths.ts`, which every importer can reach without a loop.
2. **Wave B (Phase 3 done, about −35; Phase 5 running):** Phase 3 dropped M-18 (its premise is false), kept `bundle` optional on the journal's entries since rename entries carry none, and accepted two narrow edges (an unreadable linker missing from the index stripped unrecorded; parking into an unreadable bundle dropped). Its one user-visible departure: the open pass re-files a record whose parent is gone into its deepest live ancestor's Archive, recorded for Nathan under the plan's *§Deviations*. The original step:  Phase 3's drafter reads Phases 2 and 4 and reconciles Phase 4's hunks in the files both touch (`delete.ts`, `gather.ts`, `spend.ts`, `finishOwed.ts`, `owed.ts`, `bundle.ts`, `record.ts`); Phase 5's drafter reads Phase 4.
3. **Wave C:** Phase 6's drafter (tests where their behavior lives, the bundle fixture, the closing measurement, the harness's removal), then one consistency pass over all six drafts.
4. **Assemble:** splice the drafts into the plan at its markers, fill *§Process Overview* (compaction checkpoints after Phases 2 and 4), *§Concepts*, and *§Reconciliation* from the drafts' trailing sections, and delete `Drafts/`.
5. **Review:** two read-only plan reviewers in parallel (simplification, adversarial), each reading outward as well as inward: anything the plan didn't consider, both as an error and as a missed opportunity or insight across the codebase, folded; the self-review read; the advisor.
6. **Present:** the plan's Overview and Process Overview, in plain words, with anything recorded for Nathan; on his approval, the baseline filled, STATUS Ratified, the plan committed, and `c/pre-compaction`.
