## Handoff — Pommora

> **User Prompt:** *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence."*

#### Current Focus

**Session ID:** d2aff109-72c2-4191-89cd-dc2721762020
**Dates:** 08-09-2026
**Model:** Fable 5 (1M context)

**Sidebar + DND Consolidation & Bug Fixes** — this session is the scoping and planning half; execution belongs to the sessions this document hands to.

The session opened on the drag notes flagged in Context and verified every one against the code firsthand: all accurate, one understated (`cellAt` runs per card per pointermove, not once per move). The story they tell is one story — the app has one shared gesture skeleton (`gesture.ts`, 144 lines) with two cheap hardening flaws, and four surfaces still hand-roll that lifecycle; the hand-rolls are where the bugs live, including a same-count-wrong-identity scroll-listener leak in three of them. Four read-only survey agents then swept the layer (lifecycle census, DRY audit, service-adoption matrix, missing-capability sweep) and surfaced bugs nobody had flagged — the worst being `groupingDnd`, which never invalidates its geometry inside a 280px scroller, so a mid-drag wheel commits the drop to the wrong target. Nathan ratified Tiers 1–4 (stale-slot bugs, skeleton hardening, migrations, DRY, adoption gaps) as scope, with Tier 5's product candidates routed to Context rather than built.

The plan landed at `Planning/Drag Layer — Implementation Plan.md`: eighteen tasks in six phases, sequenced staleness-fixes-first, written to writing-plans-v2 after reading every cited file whole. It survived review round 1 — a citation pass (19/20 claims confirmed; one derivation count corrected) and a build-breaking attack (11 findings, every one verified and folded; the headline was my own autoscroll task adopting the service without the precedent's re-resolve half, which would have reintroduced the wrong-target class the plan exists to kill). The click-suppression ruling settled skeleton-side: `gesture.ts` arms `suppressNextClick()` on every activated release and the per-surface conditionals delete — Nathan's confirmed call, recorded in the plan's Log.

Where it stands: **zero code has moved.** Everything verified lives in the plan; the plan is ratified and no phase is opened. One deliberate boundary to hold: the reorder snap-back Nathan feels daily is the identity/order-persistence arc, explicitly outside this plan — finishing this focus does not fix that symptom.

#### Completion Criteria

*Per Nathan's mandate, these are the plan's end-to-end completion — "done" means he can clear the session with this fully behind him. The plan's Gate 6 + Closeout checklist is the executable form of this list; neither relaxes without his say.*

- [ ] All six phases landed in order, every task's gates green (typecheck · Vitest · Biome · build at the close), exit codes read directly, red-first tests confirmed red before each fix.
- [ ] The closing verification chain ran whole: Delivery Claim → neutral verifier ("is this true?") → build-breaking attack (briefed to interleave mechanisms) → every finding fixed or carrying Nathan's ruling.
- [ ] `code-simplifier` and `comment-killer-agent` passes run over the full diff.
- [ ] The closing census greps return exactly the documented-deliberate hand-rolled set, and all four Dead Vocabulary sweeps match their controls.
- [ ] Docs true: `PommoraDND.md`'s two-family boundary and full adoption, every Made False row rewritten in its falsifying commit, `Design-Sources.md` registering the new owners, Context's flagged drag notes gone.
- [ ] `HistoryPM.md` entry written to History-Format.
- [ ] Tier-5 candidates and the plan's Sequenced After items routed into Context's standing sections; the plan document retired from `// Planning`.
- [ ] The final surface-by-surface walkthrough handed to Nathan against the running app.

#### Next Session

- Open Phase 1 at Task 1 (`groupingDnd`'s missing invalidation — the live wrong-write). The plan is the sole task list: execute in order, re-derive every command-backed count before editing, record the phase's base commit in its Log when the phase opens.
- Read the plan's Implementation Log before Phase 1 — it holds the settled ruling, the review-round record, and two open notes (the `dragChrome` z-index observation; Task 8's Latent ruling).

#### Feedback

- "Laundry done, all folded, all in their correct spaces... AND the washing machine cleaned. No debt, nothing that would leave what's currently there now evidence in the future."
- "I should be able to have your final 'done' mean that I can clear this session and start something different with this behind us and fully resolved. That's the requirement — post-plan verification, findings applied, docs updated if required, history entry resolved."
- "If a handoff is required, it must explicitly cite the end-to-end completion as the Completion Criteria."
- "Reconsider the scope of the docs claims against what you actually find."

#### Session Pointers

- The plan: `Planning/Drag Layer — Implementation Plan.md` — Goal through Closeout; its Implementation Log is the execution record and the first read.
- The retired 18-task predecessor (the identity arc, the rejected slot resolver, the weighed alternatives): `git show "9b346a0e:.claude/Planning/Drag Layer — Implementation Plan.md"` — its reasoning is inherited into the new plan's Inherited Reasoning, so the git copy is reference rather than required reading.
- `design-system/interactions/gesture.ts` — the skeleton, 144 lines; Task 4 reads it whole.
- `Components/Detail/paneDnd.tsx` — the migration precedent every Phase-3 task copies: scroll listener and autoscroll in `onActivate`, symmetric `teardown`, `swallowActiveEscape`.
- The four survey reports live only in this session's transcript below — their durable findings are folded into the plan, but the full adoption matrix is there if a task wants more detail than its Why carries.

#### Working Notes

- The existing `sidebarDnd` listener tests count adds against removes and therefore pass on the identity leak — every new leak test must assert the removed *function reference* or post-unmount behavior, never counts.
- Context was reformatted mid-session (`09727397`): the drag notes are now checkboxes under the focus sections. Find them by content; the plan's Made False table already says so.
- Nathan commits documentation in parallel while a session runs — two of his commits landed mid-turn here. Explicit-path staging is not optional.

#### Handoff Guidelines

- §Current Focus and §Next Session restate to current truth on every run; multi-compact sessions may advance ideas or reconcile information while preserving the document's cohesion.
- Resolve = delete + route — a handled item leaves the document for its real home (Context, History, Features) with no tombstone left behind.
- Standing content lives in ContextPM.md — the durable backlog, rules, and fix log; this document carries only the session.
- Handoff must not accumulate bloat: if something has been resolved, route it to Context's § Recent Work; if what you're writing doesn't need to be preserved, don't preserve it.
- Continuity: when you're given the /handoff, the document is yours, and it's your job to pass it along as standing context for future agents; preserve what the next session needs to know, remove what it doesn't.
- Parallel sessions: the latest /handoff owns the document, and every session's transcript survives through retirement into // Sessions.
- If additional guidelines appear here that aren't in the handoffs template, it means they've been user-added and should be preserved.

---

### Session Transcript

`````
`````
