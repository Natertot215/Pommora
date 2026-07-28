## Handoff — Pommora React

> **User Prompt:** Merge `contexts-spaces` into main, true `Context.md` against reality, then find the next focus. That became: a full-project feature-doc audit, the retirement of the `tierN` vocabulary from data and code, a live-driven filter investigation, and a whole-source comment + dead-code campaign.

> ⚡ **Cornerstone — carry into every handoff, unchanged (Nathan's voice).**
> *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every `file:line`, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence."*

### Session Summary — merge → audit → the truing campaign

**Session ID:** 65fae5a7-dad4-475d-902e-9bf624673db1
**Dates:** 07-27-2026
**Model:** Opus 5 (1M context)
**Compactions:** 2
**Connectors:** none
**Commands:** /compact · /handoff
**Agents:** Explore (next-focus recon) · a 26-agent feature-doc audit run as a Workflow (the one explicit opt-in) · comment-killer-agent (two passes, the second fanning out over nine subsystem slices) · code-simplifier
**Skills:** none

**What Started:** `contexts-spaces` merged into main and `Context.md` needed truing. Explore agents surfaced the next-focus candidates; Nathan picked the doc audit and the `tierN` retirement, then drove the rest live.

**What Happened Along the Way:** The audit put one agent on each of the 26 feature docs, every finding grounded against real code — 440 confirmed, 78 rejected, 39 questions routed back to Nathan. It also caught a regression of mine: removing `migrateContexts` had removed the de-facto fresh-nexus seeder, since a fresh nexus minted below the version and so always ran the migration that wrote `contexts.json`. `ensureContextsRegistry` replaced it with an idempotence test.

The `tierN` retirement went all the way down: a one-time converter minted real ULIDs for the reserved ids in both nexuses (verified zero orphans, diffed against a backup), then the vocabulary left the code — the filter's duplicated case arms, the test fixtures teaching a frontmatter shape that no longer exists, the dead `invalid-tier` error code, and `isGovernedContextKey`'s match on the legacy key form. What survives is the word used for something else: the glass and tone layers, and the `tier`/`sub` row-subordination prop.

Nathan live-drove the filter and reported it "completely backwards." It was four separate problems, three real: the comparison operators passed a row with no value (twelve sites), the pane wired no scroll mechanism at all, and — the one that made it look like nothing happened — structural bands were built from the container's Set tree rather than from surviving rows, so a filter could empty a Set and its band plus every sub-folder still drew.

**What It Ended With:** Thirty-four commits, every one gated green — closing state **typecheck 0 · lint 0 · 1911 tests / 185 files · build clean**. Six code fixes from the findings record, two defects found and fixed after it, a dead-code pass, and a whole-source comment audit. Unpushed.

**Next Session:** The simplification sweep and the code-review sweep over the settled tree — briefed on hoisting and reducing total code, since every real defect this session was one fact with two sources. Then the ~30 unruled audit questions in `Planning//Feature-Doc Audit — Findings.md`.

**Lessons Learned**

- **A fact with two sources is a defect, not untidiness.** The order key read by two sites with opposite defaults, the Context column named one thing in one layer and another a layer down, two page-value writers disagreeing about what they stamp, a code mask the editor applies three ways and the write side not at all — each looked like a small inconsistency and each was a live bug.
- **Test the path the UI takes, not the one that works.** The Context header bug survived four layers of verification because `columnLabel` was tested with the tree threaded through; the UI called it without.
- **A subagent's completion notification does not mean its descendants are done.** Reading `git status` right after one fired showed 25 files; the real total was over 90 across several more waves, and it overlapped a second writer that had to be stopped.

**Session Pointers**

- **`Planning//Open Code Findings.md`** — the live record of verified, unactioned findings, each with the `file:line` it was confirmed at. Landed items are deleted, not tombstoned.
- **`Planning//Feature-Doc Audit — Findings.md`** — 440 findings and all 39 questions with their conflicts and options; about 30 remain unruled.
- **The filter pipeline** — `Detail/Views/pipeline/`: `filter.ts` (the abstain model — `null` abstains, only `false` excludes), `group.ts` (`pruneEmptyGroups`), `resolveView.ts` (the one layer that knows a filter actually bit).

**Landmines**

- **The `.trash` layout changed.** A delete now mirrors the folder chain it came from. Anything that assumed a flat `.trash` will not find its file.
- **`rename` no longer accepts a Space or a Context.** Their membership is title-keyed, so they cascade through `renameSpaceOp` / `renameContextOp`; the generic op's `kind` excludes them at the type level.
- **`Pommora/src/graphify-out/`** — 7.4 MB of generated artifact inside `src`, untracked, pollutes every grep. Exclude it always.
- **Backups to delete when satisfied:** `~/NexusOS.pre-ulid-backup` (162 MB), `~/test.pre-contexts-backup`, `~/test.pre-ulid-backup`.

**User Feedback**

- **"Modified Time should be property CHANGE or text change, or location change, or rename. Thats all."** — schema-level property edits must never touch member pages' stamps.
- **"No safety guards or dead shit allowed for now obsolete stuff"** — the migration retires the code that supported the old shape, not just the data.
- **"Reduce code where possible to fix these"** — a fix that adds a guard is usually the wrong fix; narrowing a type or removing a source is the right one.
- **Alias is scoped, not built** — reject `|` in a title, keep the alias intact through a rename, remove anything that would conflict with wiring it later. No authoring gesture.

**Uncertain**

- The filter's new comparison semantics overturned a deliberate Swift-parity behaviour that three tests asserted. Nathan asked for it; he can veto.
- The `whatCell` rigidity fix is a layout change that was never screenshotted — his running instance predates it and carries no debug port.
- `Compactions: 2` is best-effort.

---

### Recent Sessions

- 07-22 · `contexts-spaces` · Contexts & Spaces: brainstorm → ratified plan → Phases 0–3; the registry model, bracketed title-keyed frontmatter, the three-scope rename cascade.
- 07-14 → 20 · `1968ae09` · Cards view end-to-end plus the certified cleanup campaign; merged `cards-view` → `main`.
- 07-14 → 16 · `nav-gallery-pins` · Navigation surface + NavPane/NavWindow redesign + gallery, then Multi-Tab Nexus.

### Working Notes

- **Gates:** `env -u ELECTRON_RUN_AS_NODE npm run typecheck` (the ONLY type gate) + `npx biome lint src` + `npx vitest run` + `… npm run build`; read the summary line, never a piped exit code (`set -o pipefail`). Biome auto-formats on write — never run it, never hand-align.
- **Serialize every tree-touching agent.** One writer at a time, and confirm the tree has actually stopped changing before starting the next — a completion notification only means that agent has no live children of its own.

### Rules

- Resolve = delete + route, never tag — no (resolved) / (fixed) tombstones.
- No standing content here — Pending Focuses / Fix Log / durable rules live in `Context.md`.
- One block per session, in place; parallels share the doc, never edit another's block.
- Verify before finalizing — run the no-stale-state checklist.
