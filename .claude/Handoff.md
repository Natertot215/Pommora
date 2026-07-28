## Handoff — Pommora React

> **User Prompt:** Merge `contexts-spaces` into main and find the next focus — which became a full-day cleanup pass instead: a feature-doc audit against real code, the retirement of the `tierN` vocabulary from data and code, a live-driven filter investigation, a whole-tree comment and dead-code campaign, an IPC simplification, and an adversarial review of all of it.

> ⚡ **Cornerstone — carry into every handoff, unchanged (Nathan's voice).**
> *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every `file:line`, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence."*

### Session Summary — the cleanup pass

**Session ID:** 65fae5a7-dad4-475d-902e-9bf624673db1
**Dates:** 07-27-2026
**Model:** Opus 5 (1M context)
**Compactions:** 2
**Connectors:** none
**Commands:** /compact · /handoff
**Agents:** a 26-agent feature-doc audit (one Workflow, the session's only explicit opt-in) · comment-killer-agent across several passes · code-simplifier · build-breaking-agent
**Skills:** none

**What Started:** `contexts-spaces` was merged and `Context.md` needed truing. Nathan chose the doc audit and the `tierN` retirement, then drove the rest live from the running app.

**What Happened Along the Way:** The audit put one agent on each of the 26 feature docs, every finding grounded against real code — 440 confirmed, 78 rejected, 39 questions routed back. It caught a regression of mine: removing `migrateContexts` had removed the de-facto fresh-nexus seeder, since a fresh nexus minted below the version and so always ran the migration that wrote the registry. Seeding became explicit, with an idempotence test.

Nathan live-drove the filter and reported it "completely backwards." It was four problems, three real: positive comparisons passed rows holding no value, the pane wired no scroll mechanism at all, and — the one that made it look inert — structural bands came from the container's Set tree rather than from surviving rows, so a filter could empty a Set and its band plus every sub-folder still drew.

Nine defects were fixed in total, seven of them pre-existing and unreported. The last two came out of the review's own leftovers: an `ENOTEMPTY` that had been dismissed as test flake was really the fire-and-forget index rebuild racing a nexus teardown, and the NavWindow's search branch was tested before its view mode, so searching always listed even with the rail set to Gallery.

**What It Ended With:** 59 commits, every one gated green — closing state **typecheck 0 · lint 0 · 1913 tests / 185 files · build clean**, with the previously-flaky `mutate.test.ts` now passing three consecutive full runs. Against the merge baseline (`05a98344`): **−562 comment lines, −1,111 code lines, +1,341 documentation lines.**

**Next Session:** Open. The pending focuses are in `Context.md`, and none of them is mid-flight — pick one or pick something else.

**Lessons Learned**

- **A fact with two sources is a defect, not untidiness.** Nearly every bug this session was that shape. The fix is to remove the second source — narrow a type until the wrong call can't be written, delete the duplicate, route both callers through one. A guard that catches the bad case leaves the bad case reachable.
- **Test the path the UI takes, not the one that works.** The Context header bug survived four layers of verification because the helper was tested with its argument threaded through; the UI called it without.
- **A subagent's completion notification does not mean its descendants stopped writing.** One dispatch became thirteen agents writing across ninety minutes. Forbid sub-agents in whole-tree briefs, and poll `git status` to stability before starting the next writer.
- **"Is this a why?" is the wrong comment test.** Nathan's is *"would I know this without the comment?"* — he cuts prop docs that name the prop and architectural rationale a reader could reconstruct, even when it reads like genuine reasoning.

**Session Pointers**

- **`Planning//Feature-Doc Audit — Open Rulings.md`** — the questions the audit couldn't answer without Nathan, each with its conflict and options.
- **`Planning//Open Code Findings.md`** — verified, unactioned findings with the `file:line` each was confirmed at.
- **The filter pipeline** — `Detail/Views/pipeline/`: `filter.ts` (abstain model — `null` abstains, only `false` excludes), `group.ts` (`pruneEmptyGroups`), `resolveView.ts` (the one layer that knows a filter actually bit).
- **`main/ipc.ts`** — `handleEnvelope` and `handleWindowMenu`, the two shapes every IPC handler now takes.

**Landmines**

- **The `.trash` layout changed.** A delete mirrors the folder chain it came from. Anything assuming a flat `.trash` won't find its file.
- **`rename` no longer accepts a Space or a Context.** Their membership is title-keyed, so they cascade through their own ops; the generic op's `kind` excludes them at the type level.
- **`ErrorCode` still can't reach the renderer** — the boundary flattens to a bare string at 31 sites. Main-side it's consumed at two.

**User Feedback**

- **"Modified Time should be property CHANGE or text change, or location change, or rename. Thats all."**
- **"No safety guards or dead shit allowed for now obsolete stuff"** — a migration retires the code that supported the old shape, not just the data.
- **"Reduce code where possible to fix these"** — a fix that adds a guard is usually the wrong fix.
- **The comment standard is his own hand-edits** in `da096de5`. Read them before judging any comment.

**Uncertain**

- The filter's new comparison semantics overturned a deliberate Swift-parity behaviour three tests asserted. He asked for it; he can veto.
- The `whatCell` rigidity fix and the NavView caret sizing were never screenshotted — his running instance predated both and carried no debug port.
- `Compactions: 2` is best-effort.

---

### Recent Sessions

- 07-22 · `contexts-spaces` · Contexts & Spaces: the registry model, bracketed title-keyed frontmatter, the three-scope rename cascade.
- 07-14 → 20 · `1968ae09` · Cards view end-to-end plus the certified cleanup campaign.
- 07-14 → 16 · `nav-gallery-pins` · Navigation surface + NavPane/NavWindow redesign, then Multi-Tab Nexus.

### Working Notes

- **Gates:** `env -u ELECTRON_RUN_AS_NODE npm run typecheck` (the ONLY type gate) + `npx biome lint src` + `npx vitest run` + `… npm run build`; read the summary line, never a piped exit code (`set -o pipefail`). Biome auto-formats on write — never run it, never hand-align.
- **Serialize every tree-touching agent.** One writer at a time, and confirm the tree has actually stopped changing before starting the next.

### Rules

- Resolve = delete + route, never tag — no (resolved) / (fixed) tombstones.
- No standing content here — Pending Focuses / Fix Log / durable rules live in `Context.md`.
- One block per session, in place; parallels share the doc, never edit another's block.
- Verify before finalizing — run the no-stale-state checklist.
