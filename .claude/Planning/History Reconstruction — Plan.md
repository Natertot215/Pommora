## History Reconstruction — Plan

Rebuilding `HistoryPM.md` into a complete, attributed record of Pommora from its first commit to the present. Six survey agents mapped the repository era by era; every claim below traces to a commit that was opened and read.

### The Finding That Shapes Everything

This project wrote its history entries **into the repository, alongside the work**. Those documents survive in git at their fullest, and they are richer than what the current record carries. Reconstruction is therefore recovery from primary sources rather than inference from commit subjects.

| Source | Read at | Holds |
| --- | --- | --- |
| Swift `.claude/History.md` | `git show 9169b2e7:.claude/History.md` | 237 lines, 43 entries covering 05-10 → 06-19. Pruned 06-21 by `5f0f25f8`; this is the pre-prune state. |
| React `.claude/History.md` | created 06-14 by `a863cf50` | Per-phase commit hashes, locked decisions, the Swift→React data-layer line comparison. |
| Pre-reframe timeline | `git show 3aca8063^:.claude/History.md` | Branch names in every heading, and the fuller prose behind entries later trimmed. |
| React changelog (deleted) | `git show a97511d2^:React/.claude/History.md` | 142 lines covering 06-14 → 06-29, deleted without merging a word. |
| Pre-condensation root | `git show 8709612f^:.claude/History.md` | 181 lines of dated per-arc entries, condensed to 45 on 07-03. |
| The 07-30 state | `git show 0f1bc0e1:.claude/History.md` | **15 entries** for 07-18 → 07-30 where today's record carries 9. |

Entry-authoring commits are identified for the whole 07-04 → 07-17 era and much of 07-18 → 07-29, so most entries can be anchored to the commit whose own diff wrote them.

### Corrections The Record Needs

Defects confirmed in the current document or in always-loaded instructions:

- **A duplicated paragraph.** The Cards View entry's `Pre-Merge Hardening` block reproduces the entire Certified Cleanup Campaign entry, which also stands alone. Same text twice, inherited typo included.
- **A false claim about live code.** The Contexts & Spaces entry asserts the `tierN` migration "keys its re-entry on the version alone." That migration was deleted 07-27 by `30531c17`, whose entry was itself destroyed. The record describes a path that no longer exists.
- **Version numbers with no source.** `git tag` stops at `v0.4.1`; no 0.5.x tag exists. The prefixes were retrofitted on 08-04, two entries collide on 0.5.5 because the numbering was applied to slices of one rebased branch, and "Version 0.5.1: Cards View" contradicts the era's own text calling Cards the first v0.6.0 renderer. Every contemporaneous heading was a change-title.
- **Six entries deleted on 08-04** by `ccdbcbc6` and `428a7854`: The Lint Gate Becomes Real, The tierN Era Closes, The Truing Campaign, The Cleanup Pass, One Source For The Spectrum, and the HOIST Consolidation. A seventh, The Editor Bug-Hunt, went the same way. All recoverable.
- **Misdated arcs.** The design system was founded 06-15, not 06-17 where the entry crediting it begins. The headless data layer opens 06-14, not 06-15. Hidden Groups is dated 08-03; its implementation is 08-02. The Checkbox editor sits under the 07-06 heading while its commit is 07-07.
- **Lost reversals.** View Filtering reads as though only an engine was built; the pane was built, driven through three UIX rounds, and deliberately reverted before merge. Multi-Tab Nexus treats the pins store as pre-existing; it was built the day before on the same branch.
- **`CLAUDE.md` is wrong in three places.** React is described as "initially an alternative contingency" — the root commit's own record names React + Electron as the *initial direction* with SwiftUI "deferred". The 04-26-2026 origin is unverifiable here; the first commit is 05-10 and Swift was chosen 05-13. And "its git history lives on the `swift` branch" is false: `git rev-list --count main..swift` returns 0.

### Coverage By Era

| Era | Commits | Today | Proposed | Character |
| --- | --- | --- | --- | --- |
| 05-10 → 06-13 · Swift | ~1,000 | 1 bullet entry | 6–8 short | Stays brief by decision. Reversals kept as named clauses. |
| 06-14 → 06-19 · React opens | ~230 | 3 | 4 | Genesis, the data layer, the design system, glass and drag. |
| 06-20 → 07-03 | 662 | 5 | 12–14 | The densest era in the project, with the sparsest coverage. |
| 07-04 → 07-17 | 565 | 19 | ~22 | Correctly fine-grained; nine arcs had their own branch. |
| 07-18 → 07-29 | ~260 | 9 | 13–16 | Six entries were deleted from this era alone. |
| 07-30 → 08-08 | ~295 | 17 | ~24 | Normalized; seven unrecorded arcs found. |

Swift and React commit to the same branch from 06-14 onward, minutes apart. Any date slice conflates them — Swift work is path-scoped to `Pommora/` and `External/`, React to everything else. Through 06-27 the directory names are inverted from today's: `Pommora/` is the Swift app and `React/` is the React one, so a path quoted from that era reads as false unless restated in current terms.

The proposed counts above follow each survey's own recommendation and are a floor rather than a target. Small same-day fixes each take their own short entry, which the surveys generally folded, so the real totals run higher — the figures assume only that nothing already shipped disappears.

### Voice

Entries record events. `History-Format.md` now carries the rule and its contrast table; the reconstruction applies it rather than restoring what the record used to do.

- Language that marks a call as locked, ratified, or final comes out. A rule meant to bind future work is a guideline and belongs in `// Guidelines`; a reusable insight belongs in Context's Lessons. History says a call was made and what it settled.
- Absolutes, double negatives, and this-not-that constructions state a rule where the sentence should state what happened.
- Notes-to-self and agent-to-agent phrasing belong to neither document.

The 07-17 pass that stripped the `Locked —` markers was correcting the record toward this, not damaging it. What that pass left unfinished is that the rules themselves never reached `// Guidelines`, so their content was lost along with their framing.

### What Cannot Be Recovered

- **The React desktop write path.** The five commits its own history cites (`05f9d78`, `6bd302e`, `94fa54b`, `f913c7e`, `c972385`) do not exist in this repository — verified. That work happened in a standalone checkout and arrived as one bulk resync, `e18a5804`. An entry can be written from the contemporaneous prose; it cannot be dated, sequenced, or counted.
- **The `Planning/` decision logs.** Nearly every entry from 07-04 onward ends with "decision log + plan in `Planning/`", and those files were deleted on ship by convention. The pointers in the surviving prose are dangling.
- **The FilterPane's rejected design.** Fifteen commits of live iteration exist as diffs, but the reasons it was rejected survive only as "the pane's design wasn't [right]".
- **The pre-repository origin.** If an April SwiftUI build exists, its evidence is outside this repo.

### Two Rules Worth Restoring Regardless

Both were hard-won from live bugs and survive nowhere in the project — not in History, Features, or Guidelines. They belong in `// Guidelines`, not the changelog.

- **Never transition a property derived from an interpolating variable.** A registered custom property that is animating already carries every derived value; transitioning the derived property retargets it every frame, so the element chases and overshoots. A settled-state pixel diff cannot see this class of bug at all.
- **Never claim an interaction the code can't honour.** Giving resize strips `aria-valuenow` upgraded them to focusable-splitter semantics, which demanded a tab stop and promised keyboard resize that does not exist.

### Phases

Each phase ends with the entries written, committed, and reviewable on their own. Nothing later depends on a phase being revisited.

**Phase 1 — Correct what's false.** Remove the duplicated paragraph, fix the `tierN` claim, correct the misdated arcs, and repair the three `CLAUDE.md` statements. This is independent of everything below and makes the record honest before it grows.

**Phase 2 — Recover the deleted.** Restore the seven destroyed entries from git, in the new format, with commit ranges and Actionable diffs attached. Route the two locked rules into `// Guidelines`.

**Phase 3 — Fill 07-30 → 08-08.** Write the seven unrecorded arcs the survey found, including the band-seam law and the editor bug-hunt. Widen the three entry ranges that exclude their own planning run-ups.

**Phase 4 — Normalize 07-18 → 07-29.** Drop the version-number titles for change-titles, split the fused 0.5.6, and add the arcs the era's nine entries miss.

**Phase 5 — Normalize 07-04 → 07-17.** Restore branch attribution and decision markers from the pre-reframe source; add the seven missing arcs, three of which are larger than entries that already exist.

**Phase 6 — Reconstruct 06-14 → 07-03.** The React opening, from the primary React history document.

**Phase 7 — Compress the Swift era.** Six to eight short entries from the pre-prune Swift history, keeping the reversals named: ItemsV2 built and deleted inside a week, the Views table written twice, the on-disk layout refactored and undone the next day.

**Phase 8 — Settle IDs and build the index.** Assign every ID once, in one pass, then generate the index table from the finished entries.

### Open Calls

- **The ID scheme.** Minting in write-order puts the oldest entry at the highest number — tolerable at 17 entries, confusing at ~90. Chronological renumbering costs repointing roughly ten citations, all in documents under our control. Recommendation: renumber chronologically, at Phase 8, once the entry set is final.
- **Swift depth.** "Brief" is settled; whether six entries or eight, and whether the reversals earn a clause or a sentence, is a judgment call worth making once rather than per entry.
- **Sub-labels versus splitting** for the large multi-strand arcs — the NexusRecord and identity entries set the precedent; the Swift ItemsV2 arc is the next test.
