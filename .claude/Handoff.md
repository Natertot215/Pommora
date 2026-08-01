## Handoff — Pommora React

> **User Prompt:** The record is built and closed out headless — pick up at Nathan's live check, the surfaces that spend it, and the rulings the plan flags for him.

> ⚡ **Cornerstone — carry into every handoff, unchanged (Nathan's voice).**
> *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every `file:line`, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence."*

### Session Summary — the bridge, the index, identity kind-first, then the NexusRecord end to end

**Session ID:** 6dc9212b-b419-4b10-9e15-aa2fb5aedb6e
**Dates:** 07-30-2026 → 08-01-2026
**Model:** Fable 5
**Compactions:** 7 (best-effort)
**Connectors:** none
**Commands:** /compact · /handoff
**Agents:** Explore (12x - census sweeps) · build-breaking (5x - plan attacks + the record's closeout attack) · code-simplifier (7x - per-arc + per-phase passes) · comment-killer (1x - full-diff audit) · general-purpose (12x - reviewers, implementers, the neutral verifier)
**Skills:** studio-brainstorm · writing-plans-v2 · code-simplification · project-context

**What Started:** Nathan asked for a verified state-of-the-project and a ranked map of where his focus buys the most. Six Explore lenses swept code and docs, every load-bearing claim re-verified at the cited lines. The verification found the overnight campaigns genuinely green plus nine loose ends — including two Fix Log lies, a bug recorded open that was fixed and a fix recorded landed that never covered the op the drag emits.

**What Happened Along the Way:** The early arcs ran in sequence, each closed with the simplifier-then-breaker loop. The landing-closeout batch and the docs truing landed first; Nathan's "fix the cause, not the symptom" pushed the fence fix into `detect/` as the one owner. The **IPC bridge** followed — every channel declared once in `shared/bridge.ts`, one `Result` envelope everywhere, five refusal spellings down to two — trimmed to correction-only on his directive. The **tree index** collapsed five hand-rolled per-gesture walks into `treeIndex.ts`'s one walk per tree identity with lazily cached projections; the breaker caught the one real regression pre-ship, a Map-keyed record set erasing a duplicated page id from search. A live-driven **view-embed polish batch** rode between the arcs.

The **identity arc** then rebuilt content identity kind-first: `PageID:`/`TaskID:`/`EventID:` keys, one admission predicate shared verbatim by the walk and adoption, one depth-aware folder resolver, agenda registration by sidecar id, and the old agenda architecture deleted rather than adapted. The live migration renamed 171 real files and doubled as its own end-to-end adoption test. Post-ship verification found every remaining defect in the *seam between* two individually-correct mechanisms — the lesson that shaped everything after.

The back half was the **NexusRecord**, run full-cycle. The design went through /studio-brainstorm into a decision log, killed two whole approaches on verified facts (a central `.nexus/record.json` — watched folder, ~1MB at scale, unspendable entries; provenance-in-frontmatter — lock races, refusing shapes, a strip pass), and settled on the pair-beside-artifact + baseline-in-db split over five adversarial review rounds. The plan was written with the WIP writing-plans-v2 skill, survived three review rounds (8 → 5 → 4 findings, severity falling), and Nathan ratified with the record-one judgment call explicitly presented.

Execution ran all 14 tasks across 4 phases, failing-test-first, every guard negative-controlled (disabled → red → restored). Each phase gate ran an independent simplifier + correctness reviewer on the commit range; every finding was re-verified at the cited code before folding. The gates earned their keep: a same-root re-adopt drift-clobber, ids-in-flux leaving the diff, the corrupt-registry mass-deletion guard, a Context re-entering the registry before anything moves. The closeout ran Delivery Claim → neutral verifier (claim stands, every number reproduced) → build-breaking attack, which confirmed **five uncrossed-mechanism defects by execution** — passenger keys stranded under a disambiguated Context restore, walk-order record-one able to re-mint the live original, a self-poisoning ghost registry entry on a failed move, a hand-edited pair steering data out of the nexus, and the stamped leaf mis-parsing a user's own `12__Notes.md`. All five folded red-first the same pass.

**What It Ended With:** The NexusRecord ships whole and headless: every nexus-trash delete writes its provenance pair, every genuine open latches the baseline and silently keeps the last non-empty drift, duplicated ids re-mint against the prior baseline with the original untouched by construction, and a `restore` mutate op spends pairs through a pure resolver — renamed parents resolve to their renamed homes, final titles land everywhere, membership re-applies through the one shared reconcile loop. D-15 is closed by the re-mint. Closing state: **typecheck 0 · lint 0 warnings · 1,994 tests / 179 files · build clean**, ~25 commits from base `680d996f`, tree clean, `main` unpushed. Docs are trued: [[NexusRecord]] is the feature's home, the Made False ledger closed across [[Architecture]] · [[Contexts]] · [[Properties]], History carries the arc, and the spec + plan both read as built.

**Next Session:**

1. **Nathan's live check of the record** — delete a page in-app and find its `.provenance.json` beside the artifact in `.trash`; with the app closed, Finder-copy a page, open twice, and watch the copy take a fresh `PageID` while the original keeps everything.
2. **His rulings on the three flagged calls** in the plan's Log (Deviations + Open Against Later Tasks): ambiguous-marks-spend over the plan's defer arm, the drop-evidence proxy's `excluded_folders` edge, and the eldest-by-birth-time pick on filesystems without birth time.
3. Push `main` when he says so; the deferred live UIX pass (bridge / index / navigation checklists) still wants a fresh dev launch.

**Lessons Learned**

- The writing-plans-v2 skill held up in anger: the Derivation-with-control pattern caught real drift twice, and the negative-control-every-guard rule caught two tests that passed with their guard disabled. Its 3-round review cap was right — round 3's findings were already half prescription.
- The record's whole defect surface was crossings — the sweep's skip vs the resolver's rename, the drop rule vs the next open's adjudicator, shape validation vs path safety. Review rounds scoped per-phase structurally cannot see these; only the closeout attack, briefed to interleave mechanisms, found them.
- A fixture ULID containing `U` cost a diagnosis detour *again* (Crockford has no I/L/O/U) — the landmine note existed and still got hit; generate ids or check the alphabet.

**Session Pointers**

- The plan (`Planning/NexusRecord — Implementation Plan.md`) is the execution record — its Log holds every gate round, deviation, and pending ruling; the Decision Log beside it is the ratified spec, wording aligned to as-built. The feature's durable home is [[NexusRecord]]; the code map lives in `Context.md`'s Lessons.
- The identity arc's planning docs are purged (executed); its record lives in `History.md` and the Features docs.

**Landmines**

- Any dev session predating this arc dials a main process that has since gained the record wiring and the restore op — a fresh `env -u ELECTRON_RUN_AS_NODE npm run dev` before judging anything live.
- The 8 test files stubbing `window.nexus` are `as unknown` casts with no compile-time protection against future envelope drift.

**User Feedback**

- "Restore is out of scope" meant the *interface* — the actions ship headless; scope words name layers, confirm which one.
- "Fix the decision log, it has conflicts that have been resolved" — incremental patching leaves contradiction residue; a settled spec gets a clean rewrite, not amendments.
- The consolidation lens, verbatim intent: leave the least adjacent-but-related code; future consolidation must never find things this feature should have absorbed.
- Reviews cite file + "what," never line numbers; review agents are standard dispatches, never the Workflow tool.

**Uncertain**

- The compaction count is best-effort from a long multi-day session.
- The eldest-by-birth-time record-one pick is only as good as the filesystem's birth-time support — correct on APFS, unverified elsewhere.
- The property pair variant is write-only until a surface or op spends it — its shape round-trips in tests, but no consumer has exercised a real property restore.

---

### Recent Sessions

- 07-30 · (parallel) · The band-seam law — Table/Cards disclosure seams state-free in shared GroupBand chrome behind `--band-clearance`; menu/pane disclosures audited rightly unique. → [[CardView]] · [[TableView]].

### Working Notes

- Launch: `env -u ELECTRON_RUN_AS_NODE npm run dev` — this env sets `ELECTRON_RUN_AS_NODE=1`, which crashes the GUI if not unset.
- `src/main` + preload changes need a full dev-process restart; CM6 extension code needs ⌘R; only CSS truly HMRs.

### Rules

- Resolve = delete + route, never tag — no (resolved) / (fixed) tombstones.
- No standing content here — Pending Focuses / Fix Log / durable rules live in `Context.md`.
- One block per session, in place; parallels share the doc, never edit another's block.
- Verify before finalizing — run the no-stale-state checklist.
