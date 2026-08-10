## Handoff — Pommora

> **User Prompt:** *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence."*

#### Current Focus

**Session ID:** d2aff109-72c2-4191-89cd-dc2721762020
**Dates:** 08-09-2026 → 08-10
**Model:** Fable 5 (1M context)

**Two arcs, both closed:** the **Sidebar + DND Consolidation** (PM-090 — planned, executed, verified, and hand-confirmed), then the **CSS Token Organization** that its closing review surfaced (PM-091 — the drag chrome, stray tokens, and cross-consumed recipes relocated to their owners, closed through /closeout).

The session opened on the drag notes flagged in Context and verified every one against the code firsthand: all accurate, one understated (`cellAt` runs per card per pointermove, not once per move). The story they tell is one story — the app has one shared gesture skeleton (`gesture.ts`, 144 lines) with two cheap hardening flaws, and four surfaces still hand-roll that lifecycle; the hand-rolls are where the bugs live, including a same-count-wrong-identity scroll-listener leak in three of them. Four read-only survey agents then swept the layer (lifecycle census, DRY audit, service-adoption matrix, missing-capability sweep) and surfaced bugs nobody had flagged — the worst being `groupingDnd`, which never invalidates its geometry inside a 280px scroller, so a mid-drag wheel commits the drop to the wrong target. Nathan ratified Tiers 1–4 (stale-slot bugs, skeleton hardening, migrations, DRY, adoption gaps) as scope, with Tier 5's product candidates routed to Context rather than built.

The plan landed at `Planning/Drag Layer — Implementation Plan.md`: eighteen tasks in six phases, sequenced staleness-fixes-first, written to writing-plans-v2 after reading every cited file whole. It survived review round 1 — a citation pass (19/20 claims confirmed; one derivation count corrected) and a build-breaking attack (11 findings, every one verified and folded; the headline was my own autoscroll task adopting the service without the precedent's re-resolve half, which would have reintroduced the wrong-target class the plan exists to kill). The click-suppression ruling settled skeleton-side: `gesture.ts` arms `suppressNextClick()` on every activated release and the per-surface conditionals delete — Nathan's confirmed call, recorded in the plan's Log.

On "Go," the plan then executed end to end in the same session: twenty-eight commits, all six phases, every gate's review folded, and the closing chain — Delivery Claim, neutral verification (all eleven requirements holding), and a build-breaking attack (four seam findings, zero High, all fixed) — run clean. PM-090 holds the record with its provenance (`b61f22a9^..8cbf7d23`), the plan retired from Planning at `3c6fa26d` (git holds its full Log), and Nathan's hands-on walkthrough confirmed the surfaces on 08-10. A final Opus-agent zero-debt review then closed four remaining seam holes — the disclose remeasure re-aims per frame, the GFM table re-bases its origin at activation, both reorder hooks fail closed with list-change invalidation, the photo pan joined the `lostpointercapture` contract — at `8cbf7d23`.

The review's census also exposed the chrome misplacement that became the second arc: **CSS Token Organization** (08-10, `a0095299^..f72eea16`, PM-091). The drop line, dot, host, and `DragGhost` moved into `design-system/interactions` under honest names, the ghost's glass became the `GHOST_FROST` materials recipe, `--shadow-lift`/`--drop-line-inset`/`--state-disabled` joined the tokens, and the dead `--drag-muted` alias's removal restored the drag fade that tabs, pins, and nav rows had silently lost. Footer chrome, `iconOption`, and the NavPane anchor each moved to their one owner; the banner/title and nav-list spreads were adjudicated keeps (host-scoped overrides over one owner — the theming contract working). /closeout ran whole: simplify (a shared `DropLine` component replaced six identical renders), verify (typecheck 0 · 2,280/2,280 · lint 0 · build 0), purge, insights, and the record filed. Everything stands committed through `4a8f80eb`; the tree holds only Nathan's own doc edits.

#### Completion Criteria

*Per Nathan's mandate, these are the plan's end-to-end completion — "done" means he can clear the session with this fully behind him. The plan's Gate 6 + Closeout checklist is the executable form of this list; neither relaxes without his say.*

- [x] All six phases landed in order, every task's gates green (typecheck · Vitest · Biome · build at the close), exit codes read directly, red-first tests confirmed red before each fix.
- [x] The closing verification chain ran whole: Delivery Claim → neutral verifier (all eleven requirements HOLD; its coverage findings fixed in `615fd6c2`) → build-breaking attack (4 findings, 0 High, 15 killed; all fixed in `3b51bcbe`).
- [x] `code-simplifier` passes ran per gate; the closing pass adjudicated no comment-killer dispatch warranted and the comments were audited in-line.
- [x] The closing census greps return exactly the documented-deliberate hand-rolled set, and the Dead Vocabulary sweeps match their controls (two prediction corrections recorded in the Log before it retired).
- [x] Docs true: `PommoraDND.md`'s two-family boundary and full adoption, every Made False row rewritten, Context's flagged drag notes gone. (The `Design-Sources.md` registration was declined by a recorded ruling — that doc is deliberately procedural, and a hand-maintained registry is the drift its own sweep exists to catch.)
- [x] `HistoryPM.md` §PM-090 written to History-Format.
- [x] Tier-5 candidates and the Sequenced After items routed into Context's standing sections; the plan retired from `// Planning` at `3c6fa26d` (readable via git for the full Log).
- [x] The final surface-by-surface walkthrough — driven by Nathan against the running app and confirmed (08-10).
- [x] The closing zero-debt review: every agent finding verified firsthand, all four real ones fixed (`8cbf7d23`), censuses green with controls, KNOB markers intact.
- [x] CSS Token Organization: every misplaced class, token, and recipe moved or ruled a keep with the reasoning recorded; gates green; PM-091 filed with its range and actionable diff. **Every criterion of both arcs is met; the session's work is finished.**

#### Next Session

- Both arcs are closed — the next session opens on a fresh pick from Context's Pending Focuses. The ranked candidates from this session's project assessment: **subfield reorder** (readiest single-session build; `setSubfieldOrder` has zero callers), the **identity/order-persistence arc** (the reorder snap-back Nathan feels daily; absorbs the Set-Card flash Known Issue; the retired 08-09 plan's Phase 1, recoverable via `git show 9b346a0e`, maps it), the **Known-Issues sweep + drag ride-alongs** (one session, clears ~9 Context lines), the **content index + query consumer** (the multi-session strategic unlock), or the **store split** (the session before whichever store-heavy feature comes next).
- One design ruling waits in Context's debt: `--text-dim` (a 50% white between the ramp's 65% and 35% tiers) — its `--text` sibling already collapsed onto `--label-primary`, an imperceptible composite.

#### Feedback

- "Laundry done, all folded, all in their correct spaces... AND the washing machine cleaned. No debt, nothing that would leave what's currently there now evidence in the future."
- "I should be able to have your final 'done' mean that I can clear this session and start something different with this behind us and fully resolved. That's the requirement — post-plan verification, findings applied, docs updated if required, history entry resolved."
- "If a handoff is required, it must explicitly cite the end-to-end completion as the Completion Criteria."
- "Reconsider the scope of the docs claims against what you actually find."
- "But also take the time to consider tier 3. This goes back to the same 'leave nothing that can be done now for later'. This should be a proper 'CSS Token Organization' titled PM-091 entry that HANDLES it rather than just doing the trash but leaving what fell out of the bag on the floor."

#### Session Pointers

- The plan (retired at `3c6fa26d`): `git show "839ea405:.claude/Planning/Drag Layer — Implementation Plan.md"` — Goal through Closeout; its Implementation Log is the execution record.
- The retired 18-task predecessor (the identity arc, the rejected slot resolver, the weighed alternatives): `git show "9b346a0e:.claude/Planning/Drag Layer — Implementation Plan.md"` — its reasoning is inherited into the new plan's Inherited Reasoning, so the git copy is reference rather than required reading.
- `design-system/interactions/gesture.ts` — the skeleton every window-listener drag consumes.
- `Components/Detail/paneDnd.tsx` — the migration precedent: scroll listener and autoscroll in `onActivate`, symmetric `teardown`, `swallowActiveEscape`.
- `design-system/interactions/dropChrome.css` + `DropLine.tsx` + `DragGhost.tsx` — the shared drop chrome; `GHOST_FROST` sits in `materials/glass-pane.tsx`.
- The four survey reports live only in this session's transcript below — their durable findings are folded into the plan, but the full adoption matrix is there if a task wants more detail than its Why carries.

#### Working Notes

- The existing `sidebarDnd` listener tests count adds against removes and therefore pass on the identity leak — every new leak test must assert the removed *function reference* or post-unmount behavior, never counts.
- A scoped CSS variable consumed outside its scope fails **silently** to the property's initial value — no error, no fallback. That's how three drags shipped with no source fade (`--drag-muted`); a Guidelines line is a candidate if the class recurs.
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

*The session's earlier portion (scoping through the drag-layer plan's execution and hand-confirmed walkthrough) is archived at `.claude/Sessions/Session - 08-09 > 08-10.md`.*

|| COMPACTION ||

[NATHAN]

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Summary:
1. Primary Request and Intent:
   The session covered one complete arc on Nathan's Pommora project (Electron + React/TS productivity app at `/Users/nathantaichman/The Studio/Projects/Project Pommora`, code under `Pommora/`): consolidating the drag-and-drop layer. Sequential explicit requests:
   - Investigate the Sidebar/DND/dragging debt flagged in ContextPM.md, verify docs claims against code, report non-technically.
   - Explain honest task size, concrete verification deliverables — Nathan's bar: "Laundry done, all folded, all in their correct spaces... AND the washing machine cleaned. No debt, nothing that would leave what's currently there now evidence in the future" — and whether it creates a unified framework vs "stitching without repairing the limb."
   - Dispatch survey agents for extension opportunities, DRY violations, and missing consumers across TableView, MarkdownPM, Navigation, Menus.
   - "Agreed. Tier-1-4 I want you to scope out as part of the plan. Scope what can come first if it can; then sequence accordingly. Explain what the plan produces in plain english... Look through the cited code youself before creating the plan, then send agents to verify."
   - Mid-turn mandate: Tier 5 routed to Pending Focuses; end-to-end execution with ZERO loose strings; final "done" must mean the session can be cleared with everything resolved (post-plan verification, findings applied, docs updated, history entry resolved); any handoff must cite end-to-end completion as its Completion Criteria.
   - Handoff turnover NOW (fill ContextPM Current Focus/Immediate, seed HandoffPM, transcript via agent).
   - "Go" then "I need all phases done, don't stop until your completion criteria is met" — full plan execution.
   - "Confrimed -- walkthrough done. Update /session-handoff and commit."
   - **LATEST, UNADDRESSED: "history needs its reformat and diff and commits"** — the PM-090 entry in HistoryPM.md must be reformatted to conform to History-Format.md (never read this session) and gain its diff/line-count block and commits provenance block, then be committed.

2. Key Technical Concepts:
   - PommoraDND: in-house drag engine; `gesture.ts` skeleton (`beginPointerGesture`/`usePointerGesture`, module singleton `live`, pending→active on ACTIVATION=5px travel, window listener trio, deferred capture, `swallowActiveEscape`, teardown-before-onDrop/onAbort ordering).
   - Two lifecycle families (documented in PommoraDND.md): window-listener drags on the skeleton vs element-capture scrub controls (App resizes, Slider, PhotoCropModal, window chrome) self-cleaning by design. `activation: 0` = activate-on-first-move, never on press.
   - Skeleton hardening: throw-guards (console.error, no rethrow), pointer-id filtering, blur + `buttons === 0` aborts, `onWindowScroll` + `scrollTarget` guard, skeleton-armed `suppressNextClick()` on every activated release (Nathan's ruling).
   - The resolve-fresh-before-commit invariant: invalidations (scroll/rows-push/disclose) re-resolve from `lastPoint`; drops consult `isDirty()` before reading the slot.
   - `useDragSnapshot<T>(take)` helper in `design-system/interactions/snapshot.ts` (`get/markDirty/isDirty/reset`; never caches null).
   - group.tsx WeakMap geometry cache keyed on frozen-rects identity (+width for column model); rects are replaced, never mutated.
   - dragDisclose spring-open (registerDiscloseTarget/beginDragDisclose/endDragDisclose; sticky-dirty through the Reveal animation), autoscroll (findScroller/resolveScroller/startAutoScroll), a11y announce.
   - Process discipline: writing-plans-v2 skill (red-first tests, gates per task, Made False tables, Dead Vocabulary census, claim→neutral-verify→attack as two dispatches, plan retirement); handoff skill (Session ID ownership, Completion Criteria, transcript fence).
   - Gates: `npm run typecheck` / `test` / `lint` / `build` from `Pommora/`, exit codes read directly, NEVER piped. Biome PostToolUse hook formats all writes — never hand-align.

3. Files and Code Sections:
   - `.claude/HistoryPM.md` — **the file the new request targets.** Contains index table (new row: `| 08-09-2026 → 08-10 | PM-090 | The Drag Layer Converges On One Skeleton |`) and the PM-090 entry I wrote: `#### PM-090 || The Drag Layer Converges On One Skeleton` / `**DATE:** 08-09-2026 → 08-10` followed by five `**Label:**` paragraphs (**The Stale Slot:**, **The Skeleton:**, **The Migrations:**, **One Owner Each:**, **The Adoption Gaps:**). It currently has NO commits block and NO diff/change block — that's what Nathan wants added, plus reformatting per History-Format.md.
   - `/Users/nathantaichman/The Studio/.claude/references/History-Format.md` — the format standard (per StudioMD References); NEVER read this session; the prior session's transcript shows it has Steps, §Extending Entries, Summary/change-block/Commits guidance, and that PM-004 got "the range diff … with comment and test lines held out" and a rebuilt "change block with provenance."
   - `Pommora/src/renderer/src/design-system/interactions/gesture.ts` — fully hardened skeleton; `scrollMoved` now module-private; spec fields include `onWindowScroll`, `scrollTarget`, `swallowActiveEscape`; `up` handler: pointer-id check → `detach(g)` → `suppressNextClick()` → `onDrop()`.
   - `design-system/interactions/snapshot.ts` + `snapshot.test.tsx` — the helper (had to rename .ts→.tsx for JSX in tests).
   - `design-system/interactions/group.tsx` — `zoneGeometry` WeakMap, `rowsOfCached`, `columnModelCached`, announce calls.
   - `design-system/interactions/gesture.test.ts` — 9 tests, jsdom + `vi.resetModules()` per test.
   - `Sidebar/sidebarDnd.tsx` — migrated to skeleton; `dragged` ref `{id, grabX}`; siblings computed in `takeSnapshot`; DragGhost + `table-drop-line` classes; disclose bracket with double `snap.markDirty()`.
   - `Sidebar/Sidebar.tsx` — `dndIndex = useMemo(() => buildIndex(tree), [tree])` shared across layers; `DragRow` gained `springOpen?: { collapsed, onExpand }` prop with registerDiscloseTarget effect.
   - `Components/Detail/paneDnd.tsx`, `useOptionReorder.ts`, `useStatusReorder.ts`, `groupingDnd.tsx`, `GroupingPane.tsx` (SpringableRow + memoized bands builds), `paneDndModel.ts` (`regionScan`/`withinRegion` exports), `hiddenPaneModel.ts` (consumes them).
   - `Detail/Views/Table/tableDnd.tsx`, `bandDnd.tsx`, `TableView.tsx` (column drag on skeleton with activation-time geometry, `--col-drag-x` anchored to flowed centre: `(projected - (gridLeft + lefts[from] + widths[from] / 2)) / zoom`; grip resize with resizeBaseline cleared at consuming end, not teardown).
   - `MarkdownPM/Tables/TableView.tsx` — wrap-space drag (startRel/rel/delta), geomRef, axis-matched autoscroll; `dragOrigin.test.tsx`.
   - `design-system/components/Slider/Slider.tsx` + `Slider.test.tsx` — `scrubbing` ref set in onPointerDown, cleared in onPointerUp; `revertRef`/`revertScrub`; unmount reassert via `onInput?.(clamp(value))`.
   - `design-system/components/menu/DisclosureRow.tsx` — `useDisclosureSet` return memoized on `[flipped, defaultOpen]`.
   - `testing/pointerHarness.ts` — `firePointer` defaults `buttons: 1` on down/move, 0 on up/cancel.
   - `.claude/HandoffPM.md` — session-owned; Completion Criteria all 8 ticked; transcript complete (785 lines).
   - `.claude/ContextPM.md` — Current Focus "closed and hand-confirmed"; Immediate Work empty; Tier-5 candidates + Sequenced-After debt lines routed in.
   - `.claude/Features/PommoraDND.md`, `InteractionPM.md`, `Guidelines/Build-Gotchas.md` (CDP `buttons: 1` note) — all reconciled.
   - Plan document RETIRED (deleted at `3c6fa26d`); full Log readable via `git show`.

4. Errors and fixes:
   - `replace_all "g.id"→"d.id"` hit `drag.id` producing `drad` + renamed helper params without signatures → fixed via `drad.id`→`drag.id` replace and param renames. (Lesson: substring hazards in blind replaces.)
   - Committed Task 9 with typecheck:2 (read gate after committing — the pipefail-class mistake): missing `onResizeAbort`/`onResizeEnd` in the child destructure → follow-up commit `6c6429cf`.
   - Wrote a `useEffect` with no deps array (would re-dirty per render — the exact bug class being fixed); self-caught immediately, fixed to `[rows]`.
   - Gate-1 review found my own fixes shipped dirty-only invalidation (release-without-move committed stale) and the `[bands]` effect defeating its own cache via caller identity churn → fixed in `d9f5908f` (lastPoint + re-resolve + drop belts; caller memoization; `useDisclosureSet` identity).
   - Gate-3 attack found Task 9's cancel-revert DEAD (teardown runs before onAbort, clearing resizeBaseline first) and that my claimed red-first cancel test never landed → baseline now cleared by the consuming end; skeleton-ordering test added; honesty miss recorded in the Log.
   - Neutral verifier found the Slider's `scrubbing` flag declared but never set (cancel guard + unmount reassert dead) → wired in `615fd6c2` with commit/cancel/unmount tests; also corrected the claim's "six pre-existing warnings" provenance (they were the plan's own).
   - Chrome class swap broke two sidebar test probes keyed on inline styles → probes now query `.band-drag-ghost`/`.table-drop-line`.
   - `snapshot.test.ts` JSX in .ts (TS1005) → renamed .tsx; Slider tests hit missing ResizeObserver (liquid-glass) → no-op stub.
   - First sidebar scroll-re-aim test couldn't fail (stale and fresh resolved identically) → rewrote with distinguishing geometry (fresh=noop/no-commit, stale=commit).
   - Biome lint findings (forEach return values, unused suppression) fixed as they appeared.

5. Problem Solving:
   The full drag-layer plan (18 tasks/6 phases) executed and verified: stale-slot fixes → skeleton hardening (5 guards + onWindowScroll/scrollTarget + skeleton-owned click suppression) → 5 migrations → group.tsx caching → snapshot/chrome/scan/constants consolidation → autoscroll/announce/spring-open adoption. Verification chain: Gate reviews (8-finder and 5-finder code-review runs, all findings verified firsthand then folded), census sweeps (all matched: `< ACTIVATION`→3 files, `snapshotDirty`→0, `useDragSnapshot`→9, `band-drag-ghost`→3 with test allowlist), neutral verifier (11/11 requirements HOLD), build-breaking attack (4 findings 0-High, 15 killed, all fixed in `3b51bcbe`: sticky-dirty disclose, column cursor-follow anchor, groupingDnd swallowActiveEscape + bands re-aim via resolveRef, paneDnd fail-closed resolve). Final: 2,280 tests, lint 0, build green; code +1242/−874 (tests +811/−12) across ~29 commits ba2a35ff..e1a5d3da. Handoff closed with all 8 Completion Criteria ticked (walkthrough confirmed by Nathan).

6. All user messages:
   - "I want you to look at the Sidebar, DND, and dragging mechanims that are flagged in ContextMD. This should scope out the consolidated and minimal fix across Pommora's drag engines to clean up the code, reduce total code, and fix issues that may not have even been found yet. ... explore the codebase system-by-system and map out exactly what Context.md is describing... come back with a short and non-technical report... Reconsider the scope of the docs claims against what you actually find."
   - "Explain honestly 'how big' of a task this is for you, and the verification steps with concrete deliverables that would call this work a scuess and cleanup. Laundry done, all folded, all in their correct spaces... AND the washing machine cleaned. Ne debt, nothing that would leave whats currently there now evidence in the future. Also explain if it does or doesnt create a unified framewrok rather than stitching things together without repairing the limb."
   - "Before doing this task, dispatch agents to hunt for opportunities to extend functionality where it isnt currently done that leaves this work comprehensive; and also looking in the existing location of the work for additional cleanup and DRY violations that must be handled, and consumers this output doesnt currently compose of, that SHOULD become consumers of this mechanism... Look across the board there, TableView, MarkdownPM, Navigation, Menues..."
   - "Agreed. Tier-1-4 I want you to scope out as part of the plan. Scope what can come first if it can; then sequecne accordingly. Explain what the plan produces in plain english once it's produced. Look through the cited code youself before creating the plan, then send agents to verify."
   - (mid-turn) "I want to make it known that this plan MUST include everything so that the Tier5 can be routed to pending focuses, and have a start-to-end execution of this plan include end-to-end verification and ZERO loose strings... I should be able to have your final 'done' mean that i can clear this session and start soemthing different with this behind us and fully resolved. Thats the requirement, post-plan verificiantion, findings applied, docs upated if required, history entry resolved. If a handoff is required, it must explicitly cite the end-to-end completion as the Completion Criteria."
   - "Is there a way to make the interaction ruling instead just recognize where it strted and refuse the click itself? and would that be cleaner or honestly not."
   - "Forget what I said, I honestly dont know what im talking about. What I want you to do is confirm this, look at the updated Handoffs mandate and fill in the sections of Context.md as needed (current focus, immediate...) and write the handoff seeding NOW rather than later; exclude the transcript which you can send an agent to copy and reture. Once were clean -- I want you to give me the 'starting' info I need to know alongside a pomise that once the plan completes, the full breaker + simplficiation rule runs, the History gets added, and the docs get fixed if needed. And the context.md current focus re-states what just happened and what's open rather than claiming work still needs to be done -- the job im giving you is to do all of it now."
   - "Go"
   - "I need all phases done, don't stop until your completion criteria is met /goal"
   - "Confrimed -- walkthrough done. Update /session-handoff and commit,"
   - "history needs its reformat and diff and commits" (LATEST — the active request)
   Standing constraints to preserve: stage explicit file paths only, never `git add -A`/directory adds (Nathan edits docs in parallel — `.claude/CLAUDE.md`, `.claude/PommoraPRD.md`, `.claude/VersioningPM.md` are currently modified in the working tree, are HIS, and must never be staged or reverted); gates' exit codes read directly, never piped; commit trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`; the GUI only launches with `ELECTRON_RUN_AS_NODE` unset; CDP-typing into the live editor writes the real Nexus (throwaway pages only); CDP drags must pass `buttons: 1`; line-count reports exclude comments + tests.

7. Pending Tasks:
   - **Reformat the PM-090 History entry per History-Format.md, add its diff (line counts, comment+test lines held out per the PM-004 precedent) and its commits (provenance block), then commit** — Nathan's latest message, not yet started.

8. Current Work:
   Immediately before this summary, I had just completed the `/session-handoff` close: ticked the final Completion Criterion ("The final surface-by-surface walkthrough — driven by Nathan against the running app and confirmed (08-10). **Every criterion is met; the focus is finished.**"), restated HandoffPM's Current Focus and Next Session, closed ContextPM's Current Focus ("closed and hand-confirmed") and emptied Immediate Work, had the transcription-agent append 448 transcript lines (with a noted JSONL fork it resolved by following the git-verified branch), and committed everything at `e1a5d3da` with a receipt. Nathan then sent the new request: "history needs its reformat and diff and commits" — targeting the PM-090 entry in `.claude/HistoryPM.md`, which I wrote WITHOUT reading `History-Format.md` (I used the memory conventions + PM-089's visible shape) and which lacks the commits/provenance block and range-diff change block that the format evidently requires (the prior session's PM-004 received: "recompute the range diff … with comment and test lines held out → rebuild PM-004's change block with provenance").

9. Optional Next Step:
   Address "history needs its reformat and diff and commits":
   1. Read `/Users/nathantaichman/The Studio/.claude/references/History-Format.md` in full (its Steps, Summary/change-block/Commits guidance, §Extending Entries).
   2. Reformat the `#### PM-090 || The Drag Layer Converges On One Skeleton` entry in `/Users/nathantaichman/The Studio/Projects/Project Pommora/.claude/HistoryPM.md` to conform exactly, adding the commits provenance block (the execution range is `ba2a35ff..e1a5d3da`, ~29 commits; key hashes: b61f22a9, 9cab6c04, b0db18fb, f782067b, d9f5908f, f064bbb9, a14eea47, 7100bd2c, 0fc563fb, 0af0b7db, 52ca8c94, c1403087, 6c6429cf, 69c2596a, 7fa0ee51, 600ea9de, 4587ed55, 55c9ec91, fe365604, 23c121e2, 3e5509bc, 8a694298, 615fd6c2, ead610f8, 3b51bcbe, 839ea405, 3c6fa26d, 6e742bf1, e1a5d3da) and the diff/change block with comment and test lines held out (raw numstat baseline: code +1242/−874 over `Pommora/src` excluding test files; tests +811/−12 — recompute per whatever the format specifies, likely stripping comment lines too).
   3. Commit with explicit-path staging of `.claude/HistoryPM.md` only (Nathan's three modified doc files stay untouched), with the standard co-author trailer.

If you need specific details from before compaction (like exact code snippets, error messages, or content you generated), read the full transcript at: /Users/nathantaichman/.claude/projects/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/d2aff109-72c2-4191-89cd-dc2721762020.jsonl
Continue the conversation from where it left off without asking the user any further questions. Resume directly — do not acknowledge the summary, do not recap what was happening, do not preface with "I'll continue" or similar. Pick up the last task as if the break never happened.

- BASH: Locate PM-090 entry in HistoryPM.md
- READ: [.claude/HistoryPM.md]
- BASH: List session commits oldest-first
- EDIT: [.claude/HistoryPM.md]
- BASH: Commit the PM-090 reformat with explicit-path staging

[CLAUDE]

PM-090 is now format-conformant and committed at `609c32fe`.

Three things changed, driven by [History-Format.md](../../.claude/references/History-Format.md) (which I read in full this time):

- **Provenance:** The entry now closes with the two required bullets — `**Commits:** b61f22a9^..3b51bcbe` (the code range; everything after `3b51bcbe` only touched `.claude`) and `**Diff:** Net +287 | +1059 / −772`.
- **The diff is the *actionable* figure:** comment and test lines are held out per the format, which is why it's smaller than the +1242/−874 I quoted at closeout — that number excluded tests but still counted comments. I recomputed it directly from the range.
- **Reformat:** The format bans narrating the session's own activity, so sentences like "the review over those fixes then found…" and "pinned red-first on every surface" got rewritten with the code as subject ("an invalidation followed by a release with no further move still committed the old slot"). Same treatment for "the boundary went into the record" (records/docs can't be pointed at — it now states what the call settled: scrub controls stay element-bound) and "the Slider learned to cancel" (personification). Vague nouns became module names — `groupingDnd`, `tableDnd`, `group.tsx`, `regionScan` in `paneDndModel.ts`.

Only [HistoryPM.md](.claude/HistoryPM.md) was staged; your three modified docs are untouched.

[NATHAN]

Map out the commits from the plans start-to-finish and create a list of things that would make a code review completed and end-to-end verified for final implementation to leave this behind. Create the prompt in-chat to address cleanup, comments, fixes, or polish; end-to-end verification that zero debt remains from this work and we can start fresh. Give me the in-chat prompt to paste that sends you to send the subagents, they report back and you quickly verify and fold.

[CLAUDE]

Here's the full picture, then the prompt.

#### The Commit Map — `b61f22a9^..3b51bcbe` (code) + the closing docs tail

**Phase 1 — Stale-Slot Fixes:**
- `b61f22a9` — grouping pane: mid-drag scroll re-aims the drop
- `9cab6c04` — GFM table drag survives an editor scroll
- `b0db18fb` — table row drag re-measures on a mid-drag rows push
- `f782067b` — ghost-origin formula gets one owner
- `d9f5908f` — Gate-1 fold: invalidated drags resolve fresh before committing (the release-without-move class)

**Phase 2 — Skeleton Hardening:**
- `a14eea47` — `gesture.ts` survives throwing callbacks, foreign pointers, and lost releases; `onWindowScroll` + `scrollTarget`; skeleton-owned click swallow

**Phase 3 — Migrations:**
- `7100bd2c` — sidebar drag onto the skeleton · `0fc563fb` — one tree index for both layers
- `0af0b7db` — both reorder hooks onto the skeleton
- `52ca8c94` — table column drag onto the skeleton · `6c6429cf` — resize props reach the header destructure (the post-commit typecheck fix)
- `c1403087` — cancelled resize reverts; scrub-control boundary settled

**Phases 4–5 — Consolidation:**
- `69c2596a` — one scroll-target predicate · `7fa0ee51` — `group.tsx` geometry cache · `600ea9de` — `useDragSnapshot` helper · `4587ed55` — shared drag chrome + constants

**Phase 6 + Verification Chain:**
- `fe365604` — adoption gaps: auto-scroll, announcements, spring-open
- `23c121e2` — closing simplification
- `615fd6c2` — neutral-verifier gaps: Slider scrub flag goes live
- `3b51bcbe` — attack findings: sticky-dirty disclose, column anchor, grouping Escape/re-aim, paneDnd fail-closed

**Docs tail (no code):** `f064bbb9`, `55c9ec91`, `3e5509bc`, `8a694298`, `ead610f8`, `839ea405`, `3c6fa26d` (plan retired), `6e742bf1`, `e1a5d3da` (handoff closed), `609c32fe` (PM-090 provenance).

#### What "Completed And End-To-End Verified" Means Here

The plan already ran per-phase gates, a neutral verifier, and an attack. What it *hasn't* had is a fresh-eyes pass over the **whole range as one diff** and the **final resting state** of the files — cross-phase seams and residue are exactly what per-phase gates can't see. Zero debt means all of these hold:

1. **Whole-range correctness review** — the full `b61f22a9^..3b51bcbe` diff read cold, hunting cross-phase inconsistencies (a Phase-3 migration consuming a Phase-2 shape that Phase-5 then changed).
2. **Final-state simplification** — the touched files as they sit now, not the diff: trial-and-error residue, dead exports, params a migration orphaned, two spellings of anything.
3. **Comment audit** — planning/review narration in comments, stale claims, restated values; KNOB and `(Nathan's call)` markers must *survive*.
4. **Census re-runs** — the plan's own counts still hold: `< ACTIVATION` in exactly 3 files, `snapshotDirty` at 0, 9 `useDragSnapshot` consumers, no hand-rolled window-listener trios outside the skeleton and the settled scrub family.
5. **Debug residue sweep** — `.only`/skipped tests, console noise, leftover CDP artifacts, references to the retired plan.
6. **Docs agree with code** — [PommoraDND.md](.claude/Features/PommoraDND.md), [InteractionPM.md](.claude/Features/InteractionPM.md), [Build-Gotchas.md](.claude/Guidelines/Build-Gotchas.md) describe only mechanisms that exist.
7. **Gates green, read directly** — typecheck, test, lint, build.

#### The Prompt

```
Final zero-debt review of the drag-layer work (range b61f22a9^..3b51bcbe, files under
Pommora/src/renderer/src/design-system/interactions, Sidebar, Components/Detail,
Detail/Views/Table, MarkdownPM/Tables, design-system/components/Slider).

Dispatch standard subagents in parallel — no Workflow tool:
1. A correctness reviewer over the WHOLE range as one diff — cross-phase seams,
   not per-commit re-review. It reports file:line findings with failure scenarios.
2. code-simplifier over the final state of the touched files (not the diff).
3. comment-killer-agent over the same files — KNOB and (Nathan's call) markers must
   survive; grep-verify they did after it returns.
4. An Explore agent re-running the plan's censuses (< ACTIVATION, snapshotDirty,
   useDragSnapshot consumers, stray window-listener trios, .only/console residue,
   retired-plan references) with a control token per search, and checking
   PommoraDND.md / InteractionPM.md / Build-Gotchas.md claims against the code.

One tree-touching writer at a time — serialize 2 and 3, let the tree settle between.
Verify EVERY finding firsthand at its file:line before folding; reject with reasons.
Fold what's real, then run typecheck, test, lint, build from Pommora/ with exit codes
read directly — never piped. Stage explicit files only (my modified docs stay
untouched), commit, and report: findings verified vs rejected, what changed, gate
results, and a flat yes/no on zero debt remaining. If it's yes, this work is closed
and never gets reopened.
```

One honest note: the verification chain this already went through was unusually deep — I'd put real odds on this pass coming back with cosmetic findings only. But that's the point of a closing review: it earns the "never think about this again," rather than asserting it.

[NATHAN]

send via opus agents. Final zero-debt review of the drag-layer work (range b61f22a9^..3b51bcbe, files under
Pommora/src/renderer/src/design-system/interactions, Sidebar, Components/Detail,
Detail/Views/Table, MarkdownPM/Tables, design-system/components/Slider).

Dispatch standard subagents in parallel — no Workflow tool:
1. A correctness reviewer over the WHOLE range as one diff — cross-phase seams,
   not per-commit re-review. It reports file:line findings with failure scenarios.
2. code-simplifier over the final state of the touched files (not the diff).
3. comment-killer-agent over the same files — KNOB and (Nathan's call) markers must
   survive; grep-verify they did after it returns.
4. An Explore agent re-running the plan's censuses (< ACTIVATION, snapshotDirty,
   useDragSnapshot consumers, stray window-listener trios, .only/console residue,
   retired-plan references) with a control token per search, and checking
   PommoraDND.md / InteractionPM.md / Build-Gotchas.md claims against the code.

One tree-touching writer at a time — serialize 2 and 3, let the tree settle between.
Verify EVERY finding firsthand at its file:line before folding; reject with reasons.
Fold what's real, then run typecheck, test, lint, build from Pommora/ with exit codes
read directly — never piped. Stage explicit files only (my modified docs stay
untouched), commit, and report: findings verified vs rejected, what changed, gate
results, and a flat yes/no on zero debt remaining. If it's yes, this work is closed
and never gets reopened.

- BASH: List files touched by the range and current tree state
- DISPATCH: general-purpose — Whole-range correctness review -> code-simplifier — Simplify drag-layer final state -> Explore — Census re-runs and docs check

[CLAUDE]

All three are out on Opus — the correctness reviewer over the whole range, the code-simplifier on the final state (the only writer right now), and the Explore agent on the censuses and docs claims. The comment-killer goes out once the simplifier's changes have settled, and then I verify everything firsthand before folding. I'll report when they come back.

- RETURN: all seven censuses passed at HEAD (`609c32fe`) with two counting caveats (the activation-distance pattern undercounts by two semantically-equivalent sites; the 9-file `useDragSnapshot` count is files, not occurrences) and zero code residue, but found `HandoffPM.md` pointing the next session at the already-deleted plan file and `InteractionPM.md` describing a `useExitPresence` token-drift gap the code had already closed, plus three `PommoraDND.md` imprecisions — an absolute "two shared entry points" claim against eleven real externally-imported modules, an absolute contradicted by the doc's own next paragraph, and PhotoCropModal's missing `onLostPointerCapture`.

The census agent is back — code side is clean (all seven censuses pass, zero residue), with findings only in docs. Verifying those firsthand while the other two run:

- BASH: Read cited doc lines and useExitPresence source
- READ: [.claude/HandoffPM.md]
- EDIT: [.claude/HandoffPM.md]
- BASH: Confirm the git-show pointer resolves -> Check the retired plan copy carries the execution Log
- EDIT: [.claude/Features/InteractionPM.md] -> [.claude/Features/PommoraDND.md]

Census findings folded — three docs corrected, all verified firsthand before touching them:

- **[HandoffPM.md](.claude/HandoffPM.md)** — the Session Pointer aimed at the deleted plan file now routes through `git show "839ea405:…"` (I confirmed it resolves, Log intact), and two plan-execution-era phrasings that went stale with retirement came out.
- **[InteractionPM.md](.claude/Features/InteractionPM.md)** — the "one gap is real" paragraph described `useExitPresence` reading no motion token; the code derives its default from the slow duration token, so the paragraph now states that truth instead.
- **[PommoraDND.md](.claude/Features/PommoraDND.md)** — "two shared entry points" (the tree exposes eleven externally-imported modules) and the "every window-listener drag" absolute (contradicted by the board engine two lines later) both corrected.

One census finding is held pending: PhotoCropModal is the only member of the documented scrub family without an `onLostPointerCapture` handler — that's a code decision I'll make once the simplifier finishes, since only one writer touches the tree at a time. Everything else passed: all seven censuses, zero test residue, zero redundant click-suppression, `@dnd-kit` fully absent.

The correctness reviewer and code-simplifier are still out; the comment-killer dispatches after the simplifier settles.

- RETURN: nine files simplified for a net −16 lines with gates green (typecheck 0, 2,280/2,280 tests unmodified, lint 0) — dropped four dead params and fields the migrations had orphaned, collapsed two duplicate-spelling hazards (`SnapGroup`'s `top`/`containerTop`, two independent `subBandId` mint sites that could silently diverge), hoisted the sidebar's byte-identical `SidebarDnd` wrappers into one `dndLayer(section)` and `engine.tsx`'s triple-repeated 15-field scratch object into `blankDrag()`, and flattened a nested-ternary drop classification in `groupingDnd` to match its `bandDnd` sibling; declined the cross-file `onDisclose` bracket consolidation as skeleton-scale work out of scope, and left several previously-adjudicated near-twins alone.

The simplifier landed net −16 with green gates. Verifying its diff firsthand before the comment-killer goes out:

- BASH: Show simplifier diff stat and the two logic-touching diffs

Those two are equivalent. Checking the rest — engine.tsx's scratch refactor is the riskiest:

- BASH: Review engine, group, paneDnd, sidebarDnd diffs -> Grep pid residue in group.tsx and review last three diffs
- READ: [Pommora/src/renderer/src/Components/PhotoCropModal.tsx]
- EDIT: [Pommora/src/renderer/src/Components/PhotoCropModal.tsx]
- DISPATCH: comment-killer-agent — Comment audit on drag layer

Status so far: the simplifier's nine-file diff is verified equivalent line-by-line and stays in the tree (net −16, gates green on its side), the census's doc findings are folded, and PhotoCropModal now carries the `onLostPointerCapture` the documented scrub family promises. The comment-killer is now running, and the correctness reviewer is still out — those two reports are what's left before gates and the commit.

- RETURN: four findings survived verification (one Medium, three Low) against the whole `b61f22a9^..3b51bcbe` diff read cold plus every touched file re-opened at HEAD, gates green throughout — the GFM table's drag origin can strand during a pending-phase scroll since only active gestures re-base it (its Detail sibling was already moved to activation for this exact reason), `useOptionReorder`'s `locate()` fails open to index 0 instead of failing closed like every sibling resolver, both reorder hooks skip the list-change half of the invalidation invariant that every other snapshot consumer carries, and the spring-open re-dirty flag gets consumed by the first pointer move rather than held through the whole reveal animation — plus a ten-item cleared-candidates list of mechanisms it chased and confirmed sound.

The reviewer came back with four findings (one Medium, three Low) and a cleared-candidates list. Verifying each firsthand — reads only, since the comment-killer is still writing:

- BASH: Read GFM table drag origin handling -> Check when onWindowScroll binds and gates in gesture.ts -> Read useOptionReorder snapshot and locate logic -> Read hook signatures and find their callers -> Check how callers build the order arrays

Both callers build `order` inline — fresh identity every render — so the missing invalidation effect needs caller memoization too, exactly the Gate-1 precedent. Now Finding 4's disclose bracket:

- BASH: Read dragDisclose service and sidebar bracket
- EDIT: [Pommora/src/renderer/src/design-system/interactions/dragDisclose.ts]
- BASH: Check for tests pinning dragDisclose timing

The disclose fix is in with no tests pinning the old two-tick timing. Remaining work is blocked on the comment-killer (the other three fixes touch files in its scope — GFM origin re-base at activation, `locate` fail-closed, and the rows-change invalidation effects with caller memoization). I'll fold those the moment it reports, then gates and the commit.

One reviewer verdict worth noting now: its cleared-candidates list independently re-confirmed six things the attack round had already ruled sound (the `--col-drag-x` anchor math, the WeakMap identity contract, `suppressNextClick`'s self-disarm among them) — the two verification chains agree.

- RETURN: eight edits across the drag layer, typecheck and Biome both clean, nothing staged — cut five comments that only narrated the code beneath them, trimmed three more (an uninferable cross-file pointer, a restated auto-scroll note, a stray docblock clause), kept two genuinely uninferable authoring-contract notes (`blankDrag()`'s whole-fresh-scratch rule, `subBandId`'s dual-mint hazard) plus every `KNOB`/`(Nathan's call)` marker untouched, and flagged one roadmap-flavored Sidebar.tsx comment for Nathan's own call rather than deleting it outright since it doubles as a scope guard.

The comment-killer is back — verifying its cuts against the diff before landing the last three fixes:

- BASH: Show comment-line changes across killer-touched files
- READ: [Pommora/src/renderer/src/design-system/interactions/snapshot.ts]
- BASH: Read gesture move handler and status resolve path
- EDIT: [Pommora/src/renderer/src/MarkdownPM/Tables/TableView.tsx]
- BASH: Read status hook onActivate init -> Read status onDrop and locate
- EDIT: [Pommora/src/renderer/src/Components/Detail/useOptionReorder.ts] -> [Pommora/src/renderer/src/Components/Detail/useStatusReorder.ts]
- BASH: Check imports in status hook and both editors
- EDIT: [Pommora/src/renderer/src/Components/Detail/useStatusReorder.ts] -> [Pommora/src/renderer/src/Components/Detail/StatusEditor.tsx]
- BASH: Read OptionEditor imports and reorder call
- EDIT: [Pommora/src/renderer/src/Components/Detail/OptionEditor.tsx]
- BASH: Check OptionEditor react import
- EDIT: [Pommora/src/renderer/src/Components/Detail/OptionEditor.tsx]

All fixes are in. Marker check and gates:

- BASH: Compare KNOB and Nathan's-call marker counts HEAD vs working tree -> Marker counts HEAD vs tree, corrected -> Run typecheck and lint gates -> Run full Vitest suite -> Run production build gate -> Enumerate changed files for explicit staging -> Stage explicit files and commit the review fold -> Code-only line delta for the review commit

**Zero debt remaining: yes.** Committed at `8cbf7d23` — net +2 code lines (+130/−128, comments and tests excluded), your three modified docs untouched.

#### What the Four Agents Found, and What Survived My Verification

**Correctness reviewer — 4 findings, all 4 confirmed firsthand and fixed:**
1. **GFM table pending-scroll strand (Med):** the skeleton's scroll hook only serves *active* gestures (I confirmed the gate at [gesture.ts:171](Pommora/src/renderer/src/design-system/interactions/gesture.ts#L171)), so a trackpad-inertia scroll under a fresh press froze a stale origin. Now re-based at activation, same as its Detail sibling.
2. **`useOptionReorder` failed open:** a dead snapshot at release aimed the commit at slot 0 — silently moving the option to the front. Now fails closed like every sibling; the status hook got the matching `''`-group guard.
3. **Both reorder hooks missed the list-change half of the invalidation invariant** — the only two snapshot consumers without it. Both gained the `[order]` effect, with the caller arrays memoized (they were built inline, which would have false-dirtied per move — the exact Gate-1 bug class).
4. **The spring-open dirty flag was consumed by the first move**, leaving a ~180ms window where a freeze-then-release committed mid-animation geometry. Fixed at the cause in [dragDisclose.ts](Pommora/src/renderer/src/design-system/interactions/dragDisclose.ts): the service re-aims every frame until the reveal settles, which also makes the drop line *track* the opening animation. All four surfaces inherit it with zero consumer change.

**Census agent — all 7 censuses pass; findings were docs-only, all folded:** the dangling plan pointer in HandoffPM (now routes through `git show`, verified resolvable), InteractionPM's `useExitPresence` gap that the code had already closed, PommoraDND's two false absolutes, and PhotoCropModal's missing `onLostPointerCapture` (one line — `endDrag` was already idempotent).

**Simplifier — 9 files, net −16, every edit verified equivalent line-by-line** (I checked the `pid` removal against a zero-hit grep, the ternary flatten against truth-table equivalence, the `containerTop` dedup against its identical definition). **Comment-killer — 8 cuts, all transcription comments; both marker families intact at exactly HEAD counts (89 KNOB, 10 `(Nathan's`).**

**Rejected/declined, with reasons:** the "5 semantic activation sites vs 3 literal" caveat (the two extras are the skeleton and engine — the owners, not strays); `INTERACTIVE_ACTIVATION` being undocumented (engine-private tuning; docs don't restate exacts); the killer's flagged interleave comment (kept — it's the documented scope-guard exception); the archived plan's frozen Status header (immutable git history).

**Gates:** typecheck 0 · lint 0 · test 0 (2,280/2,280) · build 0, all exit codes read directly.

One honest residual, disclosed rather than buried: the four fixes are verified by mechanism and the full suite, but carry no new pinning tests of their own. If you want them pinned the way the plan's fixes were, say so — otherwise this work is closed.

[NATHAN]

update history with proper lc

[CLAUDE]

Checking the format's extending-entries guidance, then recomputing the range diff through `8cbf7d23`:

- BASH: Read format tail and recompute range diff through the review commit
- EDIT: [.claude/HistoryPM.md]
- BASH: Commit the PM-090 extension

PM-090 updated and committed at `5b87e2d4`. The entry gained a **The Closing Seams:** block covering today's four fixes plus the residue shed, and its provenance now reflects the whole live arc:

- **Commits:** `b61f22a9^..8cbf7d23` (the review commit is the new range end)
- **Diff:** Net +289 | +1173 / −884 — recomputed over the full range with comments and tests held out, same method as before

Extending rather than opening a new entry is the format's own rule — the in-progress session's entry stays live and grows with the work. The date span (08-09 → 08-10) already covered today, so the index row needed nothing.

[NATHAN]

1. Quit and reopen my Obsidian instance — I’m on mobile and I’m unsure if my desktop is properly syncing; full reload would solve it.

2. I want you to assess the Project’s state against multiple honest stances and provide 5 options for each of next focus; include a top-5 recommendation at the end

- Existing Debt; fix-log or togers
- Written down possibilities
- Unscoped Cleanup / Refactors
- Your own ideas of features or additions that haven't even been thought of yet.

Consider what can be done in a single session, opens a multi-session focus, or anything in between. Scope each carefully

- BASH: Quit and relaunch Obsidian to force a sync reload
- READ: [.claude/ContextPM.md] -> [.claude/VersioningPM.md]

[CLAUDE]

Obsidian's relaunched fresh (new pid, full sync re-handshake). Now the assessment — built from ContextPM, VersioningPM, and what I know firsthand from living in this codebase all week.

#### 1 — Existing Debt (Known Issues + the Fix-Log Lines)

1. **The Known-Issues sweep** — the menu-row value padding (wants a pane-width-relative max-width ruling from you), the File icon clipping, the link-rename inset, the ribbon settings toggle, the drag-handle 'Embed Page' menu, and reconciling whether the codeblock-Enter jump is already dead. **Scope: one session.** Six small items, none structural — the classic batch-clean. *Deliberately excludes the Set-Card flash, which isn't a bug — it's the identity arc wearing a costume.*
2. **`onTap` + the last drag migrations** — the additive gesture hook that unblocks `listDrag`/`blockDrag` and the CalendarPicker, ending "click-or-drag surfaces the skeleton can't serve." **Scope: 1–2 sessions.** The design is already written in the docs; the risk is caret/date-pick semantics, not the skeleton.
3. **The drag arc's ride-alongs** — the `onDisclose` spec fold (four-site bracket today), the autoscroll resolve-and-start helper, and the a11y phrasing pass (cancel announcements, repeat-speak). **Scope: one session.** Finishes what PM-090 deliberately left as brackets.
4. **The perf pair** — row virtualization (TanStack Virtual is *already installed and unused for tables*) and the full-vault-walk on view/banner saves becoming a targeted patch. **Scope: multi-session, 2–3.** This is the "never reload the entire Y" rule applied to its two largest remaining violations.
5. **The small-strings bundle** — `PommoraError` widening, the `Creator` triple-spelling, `revealPageOffset`'s sleep onto `folding.ts`'s real signal, the CSS-selector editor reach becoming registered handles, the preview double-fetch dedupe. **Scope: one session.** Five near-zero-churn items that only exist as a list.

#### 2 — Written-Down Possibilities

1. **The identity/order-persistence arc** — the reorder snap-back you feel daily; the retired 08-09 plan's Phase 1 maps it and is recoverable whole from git. **Scope: multi-session, 2–3.** The natural successor: PM-090 made drags land correctly; this makes them *stay*.
2. **Subfield reorder** — `setSubfieldOrder` is fully built with zero callers; the whole feature is a three-item `SortableZone`. **Scope: single short session.** The readiest build in the app, and now sits on a hardened engine.
3. **The trash browser** — restore ships tested end-to-end; missing is one bridge entry for `listBundles` and a UI. **Scope: single session.** Finishing a finished engine.
4. **The store split (+ `mutate.ts` arms as touched)** — the boring structural session VersioningPM explicitly sequences before the next store-heavy feature. **Scope: single session.** Zero product output, but it's the toll booth before Agenda or the renderers.
5. **The content index + query consumer** — the stated prerequisite gating backlinks, Linked-From, ContextView, and `⌘K` search, and the thing that retires the tree-reload ceiling by adjacency. **Scope: genuinely multi-session, 3+.** The single biggest strategic lever on the board.

#### 3 — Unscoped Cleanup / Refactors (Not Written Down Anywhere)

1. **The drag chrome lives in the wrong house** — `.table-drop-line`/`.band-drag-ghost` serve the sidebar, panes, and grouping but live in `Table.css` under table-flavored names. It works via the global import; the *names lie*. Move into an interactions stylesheet, rename. **Scope: half a session.**
2. **The two Detail folders** — `Components/Detail` and `Detail/` split one domain, and the seams reach across (`groupingDnd` imports `bandDndModel` from `Detail/Views/Table`). A folder-boundary truing pass. **Scope: single session,** mostly `git mv` + import churn.
3. **engine.tsx ⊂ group.tsx overlap** — the two engines are adjudicated-deliberate *lifecycles*, but their internals (scratch shape, click suppression, announce, measure) overlap heavily and nobody has audited whether the single-zone engine could be the multi-zone one's core. **Scope: multi-session and honestly may adjudicate as keep** — I'd rate this the lowest-confidence item on this page.
4. **Test-probe hygiene** — this arc broke two tests that pinned inline styles rather than behavior; a sweep for probes keyed on internals would cut the next refactor's false-red tax. **Scope: one session.**
5. **Showcase truing** — the deployed component site predates MenuDropdown, ActionBand, the frost path, and this drag arc; it either demonstrates the current system or it misleads. **Scope: single session.**

#### 4 — Ideas Nobody's Written Down Yet

1. **Nexus Doctor** — an on-demand integrity panel: Unknown files, wrapped keys the registry doesn't hold (this *eats* your open question about interrupted cascades), missing sidecars, dangling connections. The report doubles as the agent-legibility flagship — the same output an agent would want as its entry-point. **Scope: 1–2 sessions** on existing walk machinery.
2. **`[[Title#Heading]]` section links** — connections resolve pages only, but PM-086 just shipped the heading scan *and* the animated travel-to-heading glide. The whole substrate exists; what's missing is grammar + resolver reach. **Scope: 1–2 sessions.**
3. **External-change trust surface** — NexusOS is an Obsidian vault *and* a Pommora nexus, so outside edits to an open page are your daily reality. Most-recent-wins already reloads; a quiet "reloaded from disk" beat makes the dual-app workflow trustworthy instead of spooky. **Scope: single short session.**
4. **A verb palette** — distinct from v0.8's search-`⌘K`: "Move page to…", "New page in…", "Set property…" as a thin consumer over the one mutation dispatcher that already exists. **Scope: 1–2 sessions,** with a design gate first.
5. **Drag a page out to Finder** — Electron's native `startDrag` handing over the real `.md`. Files-are-canonical made *tactile*; tiny surface, big philosophical flex. **Scope: half a session plus polish.**

#### Top 5, Ranked

1. **Subfield reorder** — the perfect next session: single sitting, finishes a zero-caller feature, and road-tests the hardened engine on brand-new consumer #1.
2. **The identity/order-persistence arc** — the debt you *feel*. It absorbs the Set-Card flash Known Issue, caps the drag story completely, and the retired plan already mapped its Phase 1.
3. **The Known-Issues sweep + ride-alongs** (Debt 1 + 3 merged) — one session, nine lines leave ContextPM. Washing machine cleaned.
4. **The content index + query consumer** — when you're ready for a multi-session commitment, this is the one; everything ambitious on the roadmap queues behind it.
5. **The store split** — do it the session *before* whichever store-heavy feature you pick next, exactly as the doc prescribes. Not glamorous, just correctly sequenced.

Honest stance underneath the ranking: the project has no crisis debt — the last three arcs (write path, drag layer, menus) cleaned as they went. The real fork is **finish small things** (1, 3, and the trash browser all pay immediately) versus **open the index** (4, which makes the app categorically more capable). I'd bank two quick wins first, then commit to the arc — momentum's worth more than strategy when both doors are open.

[NATHAN]

Here’s my sequencing. Please explain the drag-chrome discrepancy and how we can make it so the lines + ghost behavior live in a proper home within /design-system rather than buried in the tables. Give me a clean map of what’s misplaced and the correct home for them in the shared style sheets. Consider other opportunities for those moves. This is an explore -> move work, hardly a single session.

Come back with a simple explanation of the moves you plan to make and why certain things exist in the wrong place. I’m also open to a CSS migration of other primitives too… hand-rolled opacities or color-combinations that DO use variables but are ad-hoced as others… for example, a label-change that's technically dry, but is really just hand-rolling what --state-ghost is etc…

- BASH: Map drag-chrome class definitions and consumers -> Read drop-line, ghost CSS and DragGhost component -> List drag/state tokens and table-dnd consumers
- DISPATCH: Explore — Sweep misplaced drag chrome and token parallels

[CLAUDE]

The sweep agent is out (Opus, read-only). Here's what I've already verified firsthand while it runs — the core discrepancy explained simply:

#### Why the Drag Chrome Is in the Wrong House

When the table got the first drop-line drag, its chrome was styled in [Table.css](Pommora/src/renderer/src/Detail/Views/Table/Table.css) — correct at the time, because tables were the only consumer. Then PM-090 deliberately collapsed every surface's hand-rolled lines and ghosts onto those *same classes* — the sidebar, the properties panes, the option/status editors all now render `.table-drop-line` and `.band-drag-ghost`. The consolidation was right; the *address* never moved. So today:

- **The names lie.** A sidebar drag renders a class called `table-drop-line` from a table stylesheet. It works only because `main.tsx` imports Table.css globally — the sidebar has no real dependency on tables, just an accidental one on their stylesheet being loaded.
- **The component is misfiled too.** `DragGhost.tsx` — the floating label every drag portals to `document.body` — lives in `Components/Detail/`, and Sidebar/table code reaches *into a feature folder* to import shared chrome. Shared interaction chrome is design-system material by this project's own definition.
- **The tokens are already home** — `--drag-line`, `--drop-line-thickness`, `--drop-dot-size`, `--state-ghost` all live properly in `theme-vars.css.ts`. Only the classes and the component are squatting. That makes this a clean relocation, not a redesign: nothing visual changes.

#### The Hand-Rolled Parallel I've Already Caught

Exactly your `--state-ghost` example, one layer up: [interactions.css](Pommora/src/renderer/src/design-system/interactions/interactions.css) declares `--shadow-lift` as "**one source for every dragged-overlay treatment**" — and `.band-drag-ghost` hand-rolls its own `0 14px 34px #00000073` shadow anyway. Two near-identical lift shadows, one of them literally commented as the single source. The ghost also hand-mixes a mini-frost (`color-mix` + backdrop-blur) that may duplicate the materials' frost recipe — that's one of the things the sweep is checking against `usePaneFrost`. And `--shadow-lift` itself is a *token declared inside a component stylesheet's* `:root` instead of in `tokens/` — the same misfiling one level down.

The agent is mapping the rest: every cross-consumed class per feature stylesheet, every `:root` declaration outside `tokens/`, every raw shadow/opacity/color-mix that shadows an existing token, plus the precision questions (whether moving DragGhost into `design-system/interactions` is import-clean, and which inline styles should ride into the moved classes). Full move map with proposed homes when it reports back — no edits until you've seen it.

[NATHAN]

So --shadow-lift exists when --ghost already does and should be replaced; and table-drag-line is MISPLACED and should just be --drag-line in theme.var?

[CLAUDE]

Close on both, but each one conflates two different things — let me split them cleanly:

**On `--shadow-lift` vs `--state-ghost`: keep both — they style opposite halves of a drag.** `--state-ghost` is an *opacity*, applied to the row you picked up — the dimmed original left sitting in the list. `--shadow-lift` is a *box-shadow*, applied under the floating thing following your cursor. One fades the source, the other elevates the ghost; neither can replace the other. The real problems are placement and adoption: `--shadow-lift` is declared inside `interactions.css` instead of in `theme-vars.css.ts` where every other token lives, and `.band-drag-ghost` ignores it and hand-rolls its own nearly-identical shadow. So the move is: relocate the declaration into the token file, and make the ghost actually consume it.

**On `.table-drop-line`: it can't *become* `--drag-line`, because they're different layers — and the token half already exists.** `--drag-line` is already in theme-vars, and the line already uses it for its color. But a token only holds a *value* (a color, a thickness). `.table-drop-line` is a *class* — the full treatment composed from those tokens: positioning, height, radius, z-order, pointer-inertness. That bundle has to live somewhere as CSS; it just lives in the wrong file under a lying name. So the fix isn't tokenization — the tokens are done — it's relocation and renaming: the class moves out of Table.css into a design-system interactions stylesheet and drops the `table-` prefix (something like `.drop-line` / `.drop-dot` / `.drag-ghost`), and every consumer's class string updates to match.

Rule of thumb for this whole migration: **tokens hold values, classes hold treatments, and both belong to the design system when more than one feature consumes them.** Your two examples are one of each — a token in the wrong file (`--shadow-lift`), and a treatment in the wrong file with a wrong name (`.table-drop-line`). The sweep that's still running is finding the rest of both kinds.

- RETURN: a full misplaced-chrome map — the drop-line/dot/ghost/`DragGhost` family defined in `Table.css` but consumed by five other feature files (plus three independent parallel re-implementations of the same rule set), five `:root` token declarations living outside `design-system/tokens/` (`--shadow-lift` chief among them), and hand-rolled parallels across four categories (raw shadow hex duplicating `--shadow-lift` twice — once eight lines below the token's own declaration — six drag-opacity hand-rolls of `--state-ghost`, the drag ghost's frost recipe half-matching `PANE_FROST` with no shared owner, and tabs/pinned tabs/nav rows silently losing their drag fade because `--drag-muted` is scoped to table views only while they consume it from outside that scope) — plus a wider Tier-3 list of nine more cross-consumed non-drag classes for a separate adjudication session, and precision answers confirming the `DragGhost`/`useDragSnapshot` move is fully import-clean and naming which four of six drop-line render sites can drop their inline inset in favor of a shared token.

The sweep is back and it found more than misplacement — including one live bug. Verifying the load-bearing claims firsthand before presenting:

- BASH: Verify drag-muted scoping bug and ix-overlay shadow restatement

Both headline claims verified firsthand — including the live bug. Here's the full picture, distilled:

#### Why Things Are in the Wrong Place — One Sentence

Every time drag chrome got consolidated, the *classes* won but the *addresses* didn't: surfaces were pointed at the table's stylesheet instead of the shared treatment moving into the design system — so today the design system's drag layer owns the engines but not the pixels they draw.

#### The Live Bug the Sweep Caught

`--drag-muted` is declared *scoped to table views only* (`table-tokens.css:55`), but three drags outside tables consume it — tab strip, pinned tabs, and nav rows. Outside the scope the variable doesn't exist, so `opacity: var(--drag-muted)` silently resolves to **1**: those three drags show *no source fade at all* right now. And the token itself is a pure re-alias of `--state-ghost` — it shouldn't exist. Deleting it and pointing all five consumers at `--state-ghost` fixes the bug and kills the indirection in one stroke.

#### The Moves — Three Tiers

**Tier 1 — The Relocation (the core, mechanical):**
- `.table-drop-line` / `.table-drop-dot` / `.band-drag-ghost` move out of Table.css into a design-system interactions stylesheet, renamed without the lying prefixes (`.drop-line`, `.drop-dot`, `.drag-ghost`). Verified import-clean: nothing depends on Table.css load order, single definition site each.
- `DragGhost.tsx` moves from `Components/Detail/` to `design-system/interactions/` — its six consumers are all feature-side, and it already imports only design-system modules, so the move creates zero backward edges.
- `--shadow-lift` moves from `interactions.css`'s `:root` into the token files beside `--shadow-standard`.
- `DROP_LINE_INSET` becomes `--drop-line-inset` in theme-vars next to its two sibling dimensions — it's the third measurement of the same primitive, currently stranded as a TS constant. The moved class gets `left/right: var(--drop-line-inset)` as defaults, which deletes the identical inline style pair from *four* render sites (the table's column-aware line and the sidebar's depth-indented line keep their genuinely-different inline geometry).
- One `drop-line-host` class absorbs the four hand-rolled `position: relative` positioning contexts — including the sidebar's, which is currently a raw inline style.
- One test probe pins `.band-drag-ghost` by name and updates with the rename.

**Tier 2 — The Parallels Collapse (your `--state-ghost` category, all verified):**
- `groupingPane.css.ts` re-declares the entire drop-line rule set with hardcoded 8px insets — deletes onto the moved class.
- `dragChrome.ts` (MarkdownPM) rebuilds both classes character-for-character as imperative `cssText` — re-points at the shared classes.
- `.ix-overlay` hand-writes `0 12px 30px #00000066` — *the literal value of `--shadow-lift`, declared eight lines above it in the same file, in a comment saying it exists for `.ix-overlay`*. Peak version of your complaint.
- `.band-drag-ghost`'s `0 14px 34px #00000073` shadow → `--shadow-lift`.
- Three inline `opacity: 0.4` drag-source dims in GroupingPane hand-roll `--state-ghost` while their sibling class in the same feature does it right.
- The `--drag-muted` deletion + bug fix above.

**Tier 3 — The Wider Chrome (adjudicate before touching):** the sweep found ~9 more cross-consumed classes beyond drag — pane-footer chrome owned by Blocks, a Toolbar that imports Detail's pane recipes, breadcrumb styling reached into from Embeds, a four-stylesheet banner/title tangle, and Cards silently depending on Table.css for its group-band styling (the move in Tier 1's spirit *fixes* that one). Some of these are real moves, some may be deliberate — this tier is a separate session with per-item rulings, not a ride-along.

**Deliberately not flagged:** Cards' `0.85` dim (gentler on purpose — a ghost clone floats alongside), the notched pane's tighter beak shadow (different mechanism, different scale), "disabled" opacities (that's a *missing* `--state-disabled` token, not a duplicated one — worth a line in the backlog).

**Scope:** Tiers 1+2 together are one solid session — mechanical moves, no visual change except the three drags whose fade comes *back*, gates prove equivalence. Tier 3 is its own adjudication session.

**One design call before I start:** the drag ghost's frost. It hand-mixes a translucent fill + blur that's *almost* the materials' frost recipe, but its 78% fill is arguably load-bearing (a drag chip must stay legible over arbitrary content, where panes go transparent). Options: leave its recipe as-is and only fix the shadow, or give materials a `GHOST_FROST` variant it consumes properly. I'd do the latter — it makes the ghost officially glass. Say go (and pick a frost stance) and Tiers 1+2 run.

[NATHAN]

ghost-frost; agreed.
But also take the time to consider tier 3. This goes back to the same “leave nothing that can be done now for later”. This should be a proper “CSS Token Organization” titled PM-091 entry that HANDLES it rather than just doing the trash but leaving what fell out of the bag on the floor.

[CLAUDE]

Agreed — the bag gets fully unpacked. This is now a proper arc: Tiers 1+2, then Tier 3 handled item-by-item — moved, or ruled a keep with the reasoning recorded — closing with PM-091, docs trued, gates green. Starting now.

- BASH: Read frost recipe and main.tsx import order -> Read band-dnd rule, shadow tokens, theme-vars shape, groupingPane dropLine

The pattern's already established — `size.css.ts` exports `DISCLOSURE_INDENT` as a const that theme-vars emits as a var. `DROP_LINE_INSET` follows it exactly. Last reads, then the writes begin:

- BASH: Read shared constants, dragChrome, paneDnd host, size exports

All pieces read. Executing Tier 1+2 — tokens first, then the new chrome home, then consumers:

- EDIT: [Pommora/src/renderer/src/design-system/tokens/size.css.ts]
- BASH: Read shadow token block and drop-line token block
- EDIT: [Pommora/src/renderer/src/design-system/tokens/color.css.ts] -> [Pommora/src/renderer/src/design-system/tokens/theme-vars.css.ts]
- WRITE: [Pommora/src/renderer/src/design-system/interactions/dropChrome.css]
- EDIT: [Pommora/src/renderer/src/main.tsx] -> [Pommora/src/renderer/src/design-system/interactions/shared.ts]

Now the frost extension and the DragGhost move:

- EDIT: [Pommora/src/renderer/src/design-system/materials/glass-pane.tsx]
- BASH: Move DragGhost into design-system and list import sites -> Repoint all DragGhost imports to design-system

Formatter views noted. Now the consumer renames — reading the exact render sites in one sweep:

- BASH: Locate every old class string and inline host -> Rename chrome classes and hosts across consumers -> Locate remaining DROP_LINE_INSET uses and line renders -> Strip inset inline styles and dead imports -> Read the two import brace lists
- EDIT: [Pommora/src/renderer/src/Components/Detail/paneDnd.tsx] -> [Pommora/src/renderer/src/Detail/Views/Table/bandDnd.tsx] -> [Pommora/src/renderer/src/design-system/interactions/DragGhost.tsx] -> [Pommora/src/renderer/src/Components/Detail/settingsPane.css.ts]
- BASH: Find paneDnd wrapper className -> Compose drop-line-host onto paneDnd wrapper -> Read the three dim sites and imports
- EDIT: [Pommora/src/renderer/src/Components/Detail/groupingPane.css.ts]
- BASH: Swap grouping drop lines onto the shared class -> Replace the three inline dims with the ghosted class
- EDIT: [Pommora/src/renderer/src/Components/Detail/GroupingPane.tsx]
- BASH: Read reformatted chip row site
- EDIT: [Pommora/src/renderer/src/Components/Detail/GroupingPane.tsx] -> [Pommora/src/renderer/src/MarkdownPM/editor/dragChrome.ts] -> [Pommora/src/renderer/src/Detail/Views/Table/Table.css]
- BASH: Locate remaining Table.css deletions and drag-muted uses -> Read band-dnd and band-drag-ghost block
- EDIT: [Pommora/src/renderer/src/Detail/Views/Table/Table.css]
- BASH: Locate GroupBand.css and read its tail -> Move band drag states into GroupBand.css; list drag-muted holdouts -> Fix the three broken fades and delete the alias -> Fix comment; read interactions.css shadow block
- EDIT: [Pommora/src/renderer/src/design-system/interactions/interactions.css]

Tiers 1+2 are code-complete. Checking test probes and running the first gate:

- BASH: Find test probes on old names; typecheck -> Show typecheck errors -> Read the duplicate-attribute site
- EDIT: [Pommora/src/renderer/src/Components/Detail/GroupingPane.tsx]
- BASH: Update test probes; re-run typecheck -> Run full test suite

Tier 1+2 green — committing this chunk before Tier 3:

- BASH: Enumerate changed files and lint -> Commit Tier 1+2 with explicit paths -> Commit Tier 1+2 -> Read shell aliases vs canonical tokens

[NATHAN]

Run the /closeout processes

Commit, /session-handoff

Next session is picking something new

[CLAUDE]

Filing PM-091, sweeping Context, committing, then the handoff:

- EDIT: [.claude/HistoryPM.md] -> [.claude/ContextPM.md]
- BASH: Read PM-086 block to drop from Recent Work
- EDIT: [.claude/ContextPM.md]
- BASH: Commit the simplifier's extraction
- EDIT: [.claude/HistoryPM.md]
- BASH: Commit the docs with PM-091
- READ: [.claude/HandoffPM.md]
- EDIT: [.claude/HandoffPM.md]
- DISPATCH: transcription-agent — Continue handoff transcript
`````

<!-- transcribe-anchor: 1935915a-7a46-4dc5-8bf9-1f152b7fa46d -->
