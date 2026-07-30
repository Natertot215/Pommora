## Handoff — Pommora React

> **User Prompt:** Complete rewrite — remove stale ledgers, fix wrong details in Handoff.md and Context.md.

> ⚡ **Cornerstone — carry into every handoff, unchanged (Nathan's voice).**
> *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every `file:line`, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence."*

### Session Summary — the hardening campaign, then the navigation reckoning

**Session ID:** b0a43ec0-7809-4558-9904-cbd299902272
**Dates:** 07-29-2026 → 07-30-2026
**Model:** Fable 5
**Compactions:** 3
**Connectors:** none
**Commands:** /compact · /handoff
**Agents:** Explore (~16x - discovery lenses, Swift inventory, HOIST investigation, blast radius) · build-breaking (~5x - refactor breakers, plan attack, campaign attack) · code-simplifier (2x) · general-purpose (1x - HOIST implementer)
**Skills:** artifact-design · writing-plans · handoff · project-context

**What Started:** A ten-lens state-of-the-app discovery mission, every agent claim personally verified before ranking. Nathan picked three systemic candidates and demanded their minimal root-cause shapes: S1 (lenient reads feeding writes), S5 (two glyph resolution rules), S6 (the serial walk tax). Mid-session he pivoted to the Navigation persistence layer — "sidecars carrying tabs, data, and more that seem like they should exist as one" — and that exploration became the session's second, larger half.

**What Happened Along the Way — the shipped code:** The three refactors landed with breaker passes folded (nine findings) — `rmwJsonStrict` became the one read-modify-write with the law "a write may act on a fact, never on ignorance"; `entityIcon(kind, own, defaults)` became the one glyph rule; the walk went parallel with a stat-gated per-page cache. The inverse pass followed: a guard audit cut ~34 lines defending against impossible states, and a spend-signal bug the audit itself surfaced got fixed (`.catch(() => false)`, commit `7e5dc791`). Nathan's HOIST markers then drove a design-system consolidation — `--border-cell` (six sites), `--accent-stroke` (four sites, color-only because the weights genuinely differ), the house focus-ring channel replacing a hand-rolled twin, and the `CELL` single-sourcing — implemented by a write-enabled agent, verified line-by-line, committed `b6270097`.

**What Happened Along the Way — the navigation design:** Manual exploration killed one premise and confirmed a sharper one: the React layer stores no titles anywhere (the `title` fields Nathan saw were dead Swift-era bytes in a 25.7 KB `state.json` whose live content is ~460 bytes of orders), but stored *paths* were the real duplicate identity, with genuine repair scaffolding. The ratified design: one `navigation.json` (pinned + favorites as ID-only ordered arrays + the NavView banner), Swift parity removed wholesale, `navview.json` and the pins folder dissolved, tabs/previews stored ID-only with one restore hydrator. An adversarial plan review returned nine findings (three proven by execution — the load/write race, the echo-swallow window, the backfill re-seeding a hand-cleaned file); folding them under Nathan's "least moving parts, one shared validation" ruling flipped recents BACK to the db row — which evaporated three of the four High findings outright and kept the locked ambient-state clause intact rather than overturned.

> Nathan: "go back and verify all removal is absolute, and all implementation is absolutely necessary. Simplicity is key, totality is required."

That totality pass caught a leak the review missed: live targets passed to pin/favorite actions would have smuggled `path` fields into the file — refs now strip to bare `{kind, id}` at both the action and write boundaries, test-pinned.

**What It Ended With:** BOTH campaigns executed overnight, ~30 commits on local `main`, every one gated green — closing state **typecheck 0 · lint 0 · 1857 tests / 175 files · build clean** — none pushed. Swift parity is gone (grep reads zero in every casing), navigation persists through one contract with one validation boundary, both real nexuses were hand-migrated with zero migration code, and the closing loop ran in full: simplifier (its one flagged perf regression fixed — the tree walks once per push), a build-breaking review whose six confirmed findings were all fixed the same night (the two High ones were real data-loss paths: an ungated banner pointer feeding a file delete, and a patch-writer reading through the lenient reader — my own violation of the session's S1 law), Nathan's cross-task reconciliation sweep (three findings, fixed), and the final explicit pass (one refusal-string unification). Session net over `src`: **−147 raw / −103 code-only** across 150 files.

**Next Session:**

- The live UIX pass on a fresh dev launch — pin/unpin/reorder, recents restarting, tab restore across relaunch, rename-then-relaunch, the NavView banner from navigation.json, an outside edit to navigation.json refreshing live.
- Push `main` when Nathan says so — ~30 commits are waiting.
- The Pages-in-DB storage-model session Nathan queued (its own conversation).

**Session Pointers**

- The ratified design lives in [[Navigation]] and [[Architecture]]; `History.md` carries the campaign record and its rulings.
- The published how-Pommora-works artifact: https://claude.ai/code/artifact/7c7da95f-a42f-4cbb-9bec-d378355a188a

**Landmines**

- **Nathan's overnight dev session ran a pre-refactor main process** — if it's still open, its renderer is a post-refactor HMR hybrid whose nav calls hit missing channels. The first fresh dev launch runs the new world end-to-end; nothing the old main can write survives contact (its old channels are gone and the disks are migrated).

**User Feedback**

- "The simplest, cleanest, and minimal possible refactor... Less code is better" — then "Simplicity is key, totality is required" — then "as least moving parts as possible... around one shared validation." The through-line: every mechanism must justify itself; deletion beats machinery.
- "When a task is completed, treat it as if you never wrote it — its correctness is verified via an absolute unbiased stance."
- He reversed his own signed-off recents ruling when shown the moving-parts arithmetic — presenting the honest counter-case beat executing the earlier sign-off.

**Uncertain**

- `Compactions: 3` is best-effort.
- Two breaker PLAUSIBLEs were parked as watched, not fixed: an adopt-throw path leaking old nav arrays (no real throw path was established, and `resetNexusSession` now covers the switch surface) and a sub-frame ⌘Q-vs-in-flight-write IPC ordering window (structural, human-untriggerable as far as either of us could construct).

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
