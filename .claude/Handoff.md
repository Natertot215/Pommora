## Handoff — Pommora React

> **User Prompt:** Complete rewrite — remove stale ledgers, fix wrong details in Handoff.md and Context.md.

> ⚡ **Cornerstone — carry into every handoff, unchanged (Nathan's voice).**
> *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every `file:line`, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence."*

### Session Summary — the landing verified, the record trued, the bridge built

**Session ID:** 6dc9212b-b419-4b10-9e15-aa2fb5aedb6e
**Dates:** 07-30-2026
**Model:** Fable 5
**Connectors:** none
**Agents:** Explore (9x — six-lens scoping sweep + four-lens IPC census) · build-breaking (3x — fix-batch attack, spec plan-attack, bridge context) · code-simplifier (2x — fix-batch pass, bridge prove-me-wrong pass) · general-purpose (2x — the two serialized bridge implementers)

**What Started:** Nathan asked for a verified state-of-the-project and a ranked map of where his focus buys the most. Six Explore lenses swept the codebase and docs; every load-bearing claim was re-verified at the cited lines before ranking. The verification found the overnight campaigns genuinely green — and nine loose ends, including two Fix Log lies (a bug recorded as open that was already fixed, and a fix recorded as landed that never covered the op the drag actually emits).

**The middle:** Nathan greenlit lanes 1 and 2 — the landing-closeout batch (ref-strip boundaries for the tab/preview rows, the navwindow sentinel un-persisted, the Set-Card order patch, the icon copies converging, the fence gate) and the docs truing (five executed plans purged with their live `rm` checklists, the PRD's pre-multi-tab navigation section rewritten, the Status-groups contradiction resolved against code, History reordered newest-first). His "fix the cause, not the symptom" pushback then drove the fence fix a layer deeper: fence scanning moved into `detect/` as the one owner, `calloutLines` became fence-aware for all four consumers, and chrome now extends exactly to a fence's own quote depth.

**The main event:** the IPC bridge. Four census lenses mapped all 97+4+6 channels, the type zoo, the house idioms, and the build constraints (the sandboxed preload may require only `electron`; preload type-checks under both tsconfig projects). The spec was written, trimmed to correction-only on Nathan's directive — no nice-to-haves, the adopting-coverage extension parked as its own future behavior call — then plan-attacked: ten findings, the mechanism compiled and held, the folds adopted the reviewer's verified fixes (Stage A preserves rejections exactly; a load-bearing sentinel is never a throw disguise). Built in two independently green stages: `shared/bridge.ts` declaring every channel once with the preload deriving and main answering through one exhaustive literal; then the envelope flip — one structured `Result` everywhere, `relay` and all 31 flatten sites dissolved, five refusal spellings down to two shared constants (`no-nexus`, `busy`), the ten orphaned menu unions moved to shared. The prove-me-wrong simplifier pass Nathan mandated then found real residue (three hand-rolled menu chassis, nine passthrough arrows, ten repeated refusal strings, a redundant catch) and the claim "as clean as possible" was correctly falsified before the pass landed it.

**What It Ended With:** closing state **typecheck 0 · lint 0 (zero warnings) · 1865 tests / 175 files · build clean**, every commit gated. The bridge arc: **+1,921 / −1,723 raw** — the triple declaration died into one 311-line map, the preload halved, the docs record trued. Still unpushed with everything before it.

**Next Session:**

- The live UIX pass on a fresh dev launch — now covering BOTH arcs: the navigation checklist plus the bridge (any native menu, any write failing gracefully, a Set-Card drag holding, a row icon change reaching the open page header).
- Push `main` when Nathan says so — the stack is long now.
- The Pages-in-DB storage-model session (its own conversation); the store split is the remaining dedicated Boring Work session.

**Landmines**

- **The running dev session pre-dates two rounds of main-process rewiring.** Its renderer is dialing channels whose registration form changed wholesale; nothing works until a fresh `env -u ELECTRON_RUN_AS_NODE npm run dev`.
- The 8 test files stubbing `window.nexus` are `as unknown` casts — they got hand-updated to the new envelope but have no compile-time protection against future drift.

**User Feedback**

- "Same definitions in multiple places, and hand-rolled mechanisms that duplicate are errors and must be consolidated cleanly."
- "This is about cleanup, not more architecture. It's correction" — the directive that cut every nice-to-have from the bridge spec.
- "Go back and make sure what you did fixes the issue without patching it; the cause needs the fix, not the symptom" — which turned a renderer gate into a detection-layer fix.
- The prove-me-wrong dispatch pattern: state the "as clean as possible" claim, send an agent to falsify it. It worked; keep it.

**Uncertain**

- The bridge is verified headlessly only (gates + 1865 tests); no live launch has run the new wire end-to-end.
- The spec's review round was singular — the folds adopted the reviewer's own verified fixes, so a second round was judged manufacture-risk rather than value.

---

### Recent Sessions

- 07-29 → 30 · `b0a43ec0` · The hardening campaign (one strict RMW, one glyph rule, the parallel walk, the guard audit) + the erasure campaigns (Swift parity out wholesale; navigation onto one `navigation.json` contract, seven channels → two), ~30 gated commits, closing loop run in full.
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
