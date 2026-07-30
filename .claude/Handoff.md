## Handoff — Pommora React

> **User Prompt:** Complete rewrite — remove stale ledgers, fix wrong details in Handoff.md and Context.md.

> ⚡ **Cornerstone — carry into every handoff, unchanged (Nathan's voice).**
> *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every `file:line`, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence."*

### Session Summary — the hardening campaign, then the navigation reckoning

**Session ID:** b0a43ec0-7809-4558-9904-cbd299902272
**Dates:** 07-29-2026
**Model:** Fable 5
**Compactions:** 2
**Connectors:** none
**Commands:** /compact · /handoff
**Agents:** Explore (~16x - discovery lenses, Swift inventory, HOIST investigation, blast radius) · build-breaking (~4x - refactor breakers + plan attack) · code-simplifier (1x) · general-purpose (1x - HOIST implementer)
**Skills:** artifact-design · writing-plans · handoff · project-context

**What Started:** A ten-lens state-of-the-app discovery mission, every agent claim personally verified before ranking. Nathan picked three systemic candidates and demanded their minimal root-cause shapes: S1 (lenient reads feeding writes), S5 (two glyph resolution rules), S6 (the serial walk tax). Mid-session he pivoted to the Navigation persistence layer — "sidecars carrying tabs, data, and more that seem like they should exist as one" — and that exploration became the session's second, larger half.

**What Happened Along the Way — the shipped code:** The three refactors landed with breaker passes folded (nine findings) — `rmwJsonStrict` became the one read-modify-write with the law "a write may act on a fact, never on ignorance"; `entityIcon(kind, own, defaults)` became the one glyph rule; the walk went parallel with a stat-gated per-page cache. The inverse pass followed: a guard audit cut ~34 lines defending against impossible states, and a spend-signal bug the audit itself surfaced got fixed (`.catch(() => false)`, commit `7e5dc791`). Nathan's HOIST markers then drove a design-system consolidation — `--border-cell` (six sites), `--accent-stroke` (four sites, color-only because the weights genuinely differ), the house focus-ring channel replacing a hand-rolled twin, and the `CELL` single-sourcing — implemented by a write-enabled agent, verified line-by-line, committed `b6270097`.

**What Happened Along the Way — the navigation design:** Manual exploration killed one premise and confirmed a sharper one: the React layer stores no titles anywhere (the `title` fields Nathan saw were dead Swift-era bytes in a 25.7 KB `state.json` whose live content is ~460 bytes of orders), but stored *paths* were the real duplicate identity, with genuine repair scaffolding. The ratified design: one `navigation.json` (pinned + favorites as ID-only ordered arrays + the NavView banner), Swift parity removed wholesale, `navview.json` and the pins folder dissolved, tabs/previews stored ID-only with one restore hydrator. An adversarial plan review returned nine findings (three proven by execution — the load/write race, the echo-swallow window, the backfill re-seeding a hand-cleaned file); folding them under Nathan's "least moving parts, one shared validation" ruling flipped recents BACK to the db row — which evaporated three of the four High findings outright and kept the locked ambient-state clause intact rather than overturned.

> Nathan: "go back and verify all removal is absolute, and all implementation is absolutely necessary. Simplicity is key, totality is required."

That totality pass caught a leak the review missed: live targets passed to pin/favorite actions would have smuggled `path` fields into the file — refs now strip to bare `{kind, id}` at both the action and write boundaries, test-pinned.

**What It Ended With:** Twelve commits on local `main`, every one gated green (typecheck 0 · lint 0 · 1879 tests / 178 files · build clean) — **none pushed**. Three review-certified planning docs: [[Navigation Consolidation — Decision Log]] + [[Swift Parity Removal — Implementation Plan]] + [[Navigation Consolidation — Implementation Plan]], written to the writing-plans skill's task shape with real code in every step. Execution is greenlit, Swift parity first, under Nathan's discipline: each green task re-reviewed from an absolute unbiased stance — treat it as if I never wrote it — then the remaining plan re-read for compounding changes.

**Next Session:**

- Execute [[Swift Parity Removal — Implementation Plan]] task-by-task (the future-proofing scratchpad exists first — read it before any task).
- Between phases: write the memory doc of Swift-era facts that stop being facts, then execute [[Navigation Consolidation — Implementation Plan]].
- Push `main` when Nathan says so — twelve commits are waiting.

**Session Pointers**

- The three planning docs in `Planning/` are the working truth for navigation until the erasure task lands — the Features docs still describe the old design on purpose until then.
- The plans' `file:line` cites were verified at writing time but drift as commits land — re-verify each against the file before cutting, per task.
- The published how-Pommora-works artifact: https://claude.ai/code/artifact/7c7da95f-a42f-4cbb-9bec-d378355a188a

**Landmines**

- **A parallel session owns `MarkdownPM/Styles.css`** — modified, uncommitted, deliberately excluded from every commit here. Don't sweep it.
- **The settings/identity backfills re-seed on every app open** — hand-cleaning those disks before their code deletion ships silently reverts (proven by execution in the review). The plans order this correctly; don't reorder.
- **`tablecells` and `"gray"` are live on both real disks** — their read tolerances can't be deleted before the hand-sweeps inside their tasks run.

**User Feedback**

- "The simplest, cleanest, and minimal possible refactor... Less code is better" — then "Simplicity is key, totality is required" — then "as least moving parts as possible... around one shared validation." The through-line: every mechanism must justify itself; deletion beats machinery.
- "When a task is completed, treat it as if you never wrote it — its correctness is verified via an absolute unbiased stance."
- He reversed his own signed-off recents ruling when shown the moving-parts arithmetic — presenting the honest counter-case beat executing the earlier sign-off.

**Uncertain**

- `Compactions: 2` is best-effort.
- The Swift comment-line estimate was corrected by the review from ~55 to ~106 lines across ~37 files — the plan carries the corrected figure, but the sweep itself will find the real number.

---

### Recent Sessions

- 07-27 → 29 · `65fae5a7` · One syntax for every Pommora-owned key: `<Status>:`/`(Areas):` wrapped title keys at the frontmatter root, the SQLite migration (`node:sqlite`, eight files → `nexus.db`), 93 gated commits, pushed.
- 07-22 · `contexts-spaces` · Contexts & Spaces: the registry model, title-keyed frontmatter, the three-scope rename cascade.
- 07-14 → 20 · `1968ae09` · Cards view end-to-end plus the certified cleanup campaign.
- 07-14 → 16 · `nav-gallery-pins` · Navigation surface + NavPane/NavWindow redesign, then Multi-Tab Nexus.

### Working Notes

- **Gates:** `env -u ELECTRON_RUN_AS_NODE npm run typecheck` (the ONLY type gate) + `npx biome lint src` + `npx vitest run` + `… npm run build`; read exit codes directly, never through a pipe. Biome auto-formats on write — never run it, never hand-align.
- **Serialize every tree-touching agent.** One writer at a time, and confirm the tree has actually stopped changing before starting the next.
- **Launch:** `env -u ELECTRON_RUN_AS_NODE npm run dev` — this env sets `ELECTRON_RUN_AS_NODE=1`, which crashes the GUI if not unset.

### Rules

- Resolve = delete + route, never tag — no (resolved) / (fixed) tombstones.
- No standing content here — Pending Focuses / Fix Log / durable rules live in `Context.md`.
- One block per session, in place; parallels share the doc, never edit another's block.
- Verify before finalizing — run the no-stale-state checklist.
