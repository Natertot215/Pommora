## Handoff — Pommora

> **User Prompt:** Execute the Path Links plan end to end through `c/plan-execution`: nine phases, each landed by one executor, read by a simplification and an adversarial reviewer under BRIEF.md's principles, folded, aligned in the plan, committed, measured, and live-driven, with compaction checkpoints before Phases 4, 7, and 9, then Final Verification and `c/save-delta`.

#### Current Focus

**Session ID:** 439cb304-24a6-4f16-aa59-0b3f5d191f35
**Dates:** 10-17-2026 to 10-19-2026
**Model:** Fable 5.1 orchestrating, with Opus executors and reviewers

**Path Links has landed its nine phases, with Final Verification as the next session's focus.** Links name pages by path where a title is shared and follow their page through every rename, move, and restore, inside or outside the app; the plan, its decisions, and its deviations sit in `.claude/Planning/Path Links/`.

- **Read and write:** a link's page half is read as written in both syntaxes, `.md` and all, and keyed by one `pageKey`; every writer spells a page through one naming rule, the title where it names the page alone, the full path with the title as alias otherwise.
- **Search and click:** one matcher over a name and its location serves the picker, the sidebar, the Trash, views, and the block menu, every list a typed query is picked from ranking by score; a click on an unresolved link seats the caret in its name everywhere a link rests.
- **Re-spell:** every operation that moves or adds a page runs inside the settle's turn and re-spells by the index's difference across it; a rename or move made outside the app is paired by the page's ID across any number of watcher batches and takes the same rewrite; a rewrite that would change a link by its `.md` alone leaves it as written.
- **Trash:** the delete records which page each outbound link named, parking resolves against the trashed pages at the paths they left, and a restore repairs the returning page's own links, re-spells the live world for its arrival, and refills stripped values by identity.

The ledger reads +553 over eight code phases against the plan's roughly +390 estimate; each phase's row names what its overage bought.

#### Completion Criteria

- [x] Phases 1–9 landed, each after a two-reviewer checkpoint whose accepted findings were folded before commit; two review-found defects fixed in each of Phases 7 and 8.
- [x] The Path Links Drive (`.claude/scripts/Path Links Drive/live-drive.mjs`) holds 321/321 at Phase 8 across groups 1–8, run from a detached worktree.
- [x] Gates green from the Phase 9 head: typecheck, lint, 8327 tests (2 skipped).
- [ ] Final Verification: the simplification and two adversarial lenses at `opus-xhigh` carrying BRIEF.md's §Guiding Principles and §Philosophies in full, the `fable-high` neutral gate given only the intention, the full drive run, reconciliation, STATUS and BASELINE's End, and the report through `c/save-delta`.

#### Next Session

- **Final Verification**, in the order *§Final Verification* lists; the lenses read the Phase 8 amendment (`f212ab06b`, Deviation 2) as a line of review.
- **Owner's rulings still open** under the plan's *§Open Items*: un-excluding a folder re-spells every collision it lands; a key two trashed pages answer in one bundle parks nowhere; an unparseable Contexts registry owes the tile sweep nothing; a Set restored with an ID-less page isn't listed for stamping (a settle finding predating the plan).

#### Session Pointers

- **The one key and naming rule:** `pageKey`, `writtenName`, `namesOf`, `respell` in `Core/Connections/pageIndex.ts`; `respellings` and `rewriteConnections` in `Core/Connections/rewrite.ts`.
- **The one matcher:** `matchKey`, `matchQuery`, `matchScore`, `rankMatches` in `Core/Paths/caseFold.ts`.
- **The settle's turn:** `inSettleTurn`, `settledIndex`, `relink`, `payOutsideMoves`, `paid` in `Core/Nexus/settle.ts`; `addressed` in `Core/Nexus/mutate.ts`; `IndexSeen` and `oweSeen` in `Core/Index/indexSeed.ts` and `Core/Nexus/fileEvents.ts`.
- **The Trash:** `gatherLinkTargets` in `Core/Trash/gather.ts`; `trashedPages`, `trashedPagesOf`, `parkLinks` in `Core/Trash/holdings.ts`; `repairLanded` in `Core/Trash/restoreScrub.ts`; the restore's repair and cascade in `Core/Trash/spend.ts`; `frozenWorld` in `Core/Properties/propertyValue.ts`.

#### Working Notes

- **Commit paths:** `git commit --only -- Core Desktop UIX <plan>`; the owner's own `.claude/` edits ride only where a phase's document shares the file.
- **The drive:** build a worktree at the head under test (`zsh .claude/scripts/editor-parity/worktree.sh <head> /private/tmp/claude-501/pl-drive-wt`), run groups cumulatively with `POMMORA_PL_LANDED` set, and run only while nothing else is active and nobody types; a focus loss aborts it and is an environment finding. Remove the worktree after.
- **Every grep is `git grep`:** `grep -rn` reaches `Desktop/out/`.
