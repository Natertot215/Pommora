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

- [x] All six phases landed in order, every task's gates green (typecheck · Vitest · Biome · build at the close), exit codes read directly, red-first tests confirmed red before each fix.
- [x] The closing verification chain ran whole: Delivery Claim → neutral verifier (all eleven requirements HOLD; its coverage findings fixed in `615fd6c2`) → build-breaking attack (4 findings, 0 High, 15 killed; all fixed in `3b51bcbe`).
- [x] `code-simplifier` passes ran per gate; the closing pass adjudicated no comment-killer dispatch warranted and the comments were audited in-line.
- [x] The closing census greps return exactly the documented-deliberate hand-rolled set, and the Dead Vocabulary sweeps match their controls (two prediction corrections recorded in the Log before it retired).
- [x] Docs true: `PommoraDND.md`'s two-family boundary and full adoption, every Made False row rewritten, Context's flagged drag notes gone. (The `Design-Sources.md` registration was declined by a recorded ruling — that doc is deliberately procedural, and a hand-maintained registry is the drift its own sweep exists to catch.)
- [x] `HistoryPM.md` §PM-090 written to History-Format.
- [x] Tier-5 candidates and the Sequenced After items routed into Context's standing sections; the plan retired from `// Planning` at `3c6fa26d` (readable via git for the full Log).
- [ ] The final surface-by-surface walkthrough — handed to Nathan below; his hands on the running app are the one box only he can tick.

#### Next Session

- The plan executed end to end this same session — all 18 tasks, six gates, the verification chain, docs, PM-090, and the plan's retirement (`3c6fa26d`). What remains is Nathan's walkthrough of the changed drag surfaces in the running app: sidebar drags (all entity kinds, a scroll mid-drag, Escape, dwelling over a collapsed Collection), a table row/band/column drag with the same trio, the option and status editors past their fold, the grouping pane, a GFM table inside the editor, the Scale slider's cancel, and a column-width grip Escape. A main-process restart isn't needed — everything is renderer-side, ⌘R suffices on a running dev instance.
- Anything that feels off in hand goes to Context's Known Issues; the standing backlog (Tier-5 candidates included) lives in Context's Pending Focuses.

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
[NATHAN]

/model claude-fable-5[1m]

@.claude/ContextPM.md  
Don't read the handoff; it's captured in history.

--

I want you to look at the Sidebar, DND, and dragging mechanisms that are flagged in ContextMD. This should scope out the consolidated and minimal fix across Pommora's drag engines to clean up the code, reduce total code, and fix issues that may not have even been found yet. 

I want you to explore the codebase system-by-system and map out exactly what Context.md is describing, and where the issue truly is found within the DND system. 

When you've clearly mapped out all the wiring, please come back with a short and non-technical report of what the actual issue is so Nathan can understand and how to fix it so that these notes in Context.md can be clearly removed and we can be one step closer into working on something exciting. 

Reconsider the scope of the docs claims against what you actually find.

[CLAUDE]

I'll map the drag machinery flagged in ContextPM — the `gesture.ts` skeleton, `sidebarDnd`, the SurfacePM sensors, and the smaller reorder surfaces — verifying each doc claim against the actual code before scoping the fix. Setting up a todo list and starting with the docs and file locations.

- READ: [.claude/Features/PommoraDND.md]
- BASH: List interactions and SurfacePM directories -> Show the descoped drag-layer plan commits -> Locate sidebarDnd and gesture-skeleton consumers -> Get plan path, working-tree doc diffs, and latest sidebar fix stat -> Full message of the latest sidebar fix commit -> Extract the retired drag-layer plan to scratchpad
- READ: [/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/d2aff109-72c2-4191-89cd-dc2721762020/scratchpad/drag-plan.md]
- BASH: Recent commits, persistable presence, file sizes
- READ: [Pommora/src/renderer/src/design-system/interactions/gesture.ts] -> [Pommora/src/renderer/src/Sidebar/sidebarDnd.tsx]
- BASH: Locate hit-test helpers in group.tsx and SidebarDnd mounts
- READ: [Pommora/src/renderer/src/design-system/interactions/group.tsx] -> [Pommora/src/renderer/src/Sidebar/Sidebar.tsx] -> [Pommora/src/renderer/src/design-system/interactions/group.tsx] -> [Pommora/src/renderer/src/Components/Detail/useOptionReorder.ts]
- BASH: Locate column-drag lifecycle and status reorder listeners -> Check status reorder lifecycle and file sizes

Report's ready. I read every flagged file whole — `gesture.ts`, `sidebarDnd.tsx`, `group.tsx`, both reorder hooks, the column drag, `Sidebar.tsx` — plus the retired 676-line drag-layer plan and the commit that rescoped it.

#### What The Notes Are Actually Describing

It's one story, not six separate problems. Pommora has **one shared "how a drag starts, moves, and ends" module** — `gesture.ts`, all of 144 lines. Most drag surfaces already use it. **Four surfaces still carry their own hand-written copy of that same lifecycle:** the sidebar tree, the table's column drag, and the two little reorder lists (Select options, Status groups). Every real defect flagged in ContextPM lives either in those copies or in two small flaws in the shared module itself. That's the whole issue: the app pays four times for one mechanism, and the copies are where the bugs breed.

I verified every claim against the code firsthand. **All of them are true, exactly as written:**

- **The leak** ([sidebarDnd.tsx:295](Pommora/src/renderer/src/Sidebar/sidebarDnd.tsx#L295)) — when a drag surface disappears mid-drag, its cleanup tries to remove a scroll-listener using a *different copy of the function* than the one it registered, so removal silently does nothing and the listener stays for the session. Confirmed — and it's not just the sidebar: **the option and status reorder hooks carry the identical leak.** The shared module can't have this bug by construction, which is the whole argument for migrating.
- **The two shared-module flaws** ([gesture.ts:90](Pommora/src/renderer/src/design-system/interactions/gesture.ts#L90), [gesture.ts:59](Pommora/src/renderer/src/design-system/interactions/gesture.ts#L59)) — confirmed. One lets a drag that failed to start still "commit" a drop when you release; the other can permanently jam *every* drag in the app until reload if cleanup ever throws. Neither has ever been observed — this is cheap insurance (~6 lines), not a live bug — but the exposure grows with each surface that migrates on.
- **The wasted work** — confirmed, and one is *worse* than the note says: the card board rebuilds its row geometry on every mouse movement, and `cellAt` actually runs **once per card per movement**, not once per movement. All of it derives from data frozen at drag start, so caching it is trivial and safe.

#### Where I'd Adjust The Docs' Claims

- The cross-fade note says it "renders two full trees" — slightly overstated: each layer renders its own *half*; what's duplicated is the full-tree **drag index** each builds. The fix ContextPM suggests (share one index) is also the right one — the retired plan's alternative (narrow each index) carried a real wrong-depth risk its own review flagged.
- The retired 18-task plan is **mostly not this work**. The thing you actually *feel* — a page reorder snapping back and only sticking after reload — is the identity/order-persistence arc, which the last commit explicitly ruled a separate concern. Cleaning these DND notes will not fix that symptom, and I want that expectation set now.

#### The Consolidated Minimal Fix

Three steps, in order, roughly **−150 to −200 net lines**:

1. **Harden the shared module** (~6 lines added): the two try/finally guards, plus one small bonus — teach it to ignore a second finger/pointer, which the sidebar's copy already does and would otherwise lose in migration.
2. **Retire the four copies** onto the shared module. The sidebar is the big one (~100 lines of duplicate lifecycle out, leak dead, and its per-move sibling re-filtering fixed in passing); the other three are ~30–60 lines each, and the column drag gains Escape-to-cancel for free.
3. **Cache the frozen geometry** in the card board and hoist the sidebar's drag index up one level so both cross-fade layers share it (~15 lines added).

That erases ContextPM lines 126, 127, 129, and 130 outright; line 131 (the MarkdownPM decline) is a permanent boundary that should shrink into [[PommoraDND]] rather than sit as debt. Deliberately **out**: the slot-resolver/snapshot-helper/chrome consolidation from the retired plan (a bigger refactor that builds new abstractions rather than deleting), the surfaces documented as hand-rolled by design (`engine`, `group`, SurfacePM, window chrome), and the identity/persistence arc.

Say the word and I'll run it — step by step, gates between each.

[NATHAN]

Explain honestly "how big" of a task this is for you, and the verification steps with concrete deliverables that would call this work a success and cleanup. Laundry done, all folded, all in their correct spaces... AND the washing machine cleaned. No debt, nothing that would leave what's currently there now evidence in the future. Also explain if it does or doesn't create a unified framework rather than stitching things together without repairing the limb.

[CLAUDE]

#### How Big This Honestly Is

Not big — *careful*. Nothing here is intellectually hard, and I won't pretend otherwise: three of the four migrations are mechanical transcriptions onto a primitive that already exists and already has a working precedent (`paneDnd`). The one piece with real weight is the sidebar — 537 lines, five drop conventions, a surface you drag daily. The risk there isn't difficulty, it's *behavioral drift while transplanting* — a drop that lands one slot off, a tap that stops clicking. That's contained by red-first tests and live drags, not by cleverness. Honest sizing: **the scope from my report is one focused session; your bar below makes it two.**

#### Your Bar Changes The Scope — I Have To Say So

"Nothing that would leave what's currently there as evidence" is a *higher* bar than the minimal fix I scoped. The minimal fix kills the bug class but leaves visible lint: the sidebar's hand-rolled ghost and drop line (spelled in literals, `var(--accent)` direct — a standing [[Design-Sources]] violation), six copies of the same snapshot six-liner, and `hiddenPaneModel`'s verbatim copy of its neighbour's scan. A future reader would still see the duplication era. So the washing-machine scope adds three small pieces from the retired plan: the shared snapshot helper, the chrome moved onto `DragGhost` and tokens, and the pane-model dedup. All deletion-shaped. What I'd still **decline** is the plan's shared slot resolver — its own attack review showed the signature cracking, and per-surface slot math is genuine domain geometry, not debt. Forcing it would be manufacturing the abstraction Nathan's asking me not to stitch.

#### Unified Framework, Or Stitched Limb?

Straight answer: **it unifies the layer that was actually broken, and deliberately does not unify the layers that were never broken.** After this, exactly one thing in the app knows how a drag *starts, moves, ends, and cleans up* — hardened, with every insertion-line surface on it. That's the limb repaired, because every defect flagged lives in that lifecycle layer. What stays plural is plural *on purpose and on record*: the two engines (`engine.tsx`, `group.tsx`) and SurfacePM keep their own lifecycles because they handle aborts the skeleton has no concept of — that's [[PommoraDND]]'s documented architecture, not leftover stitching. A "framework" that swallowed the engines too would be a rewrite with no payoff. The test for whether the result is unified: a fresh agent reading the drag layer finds one lifecycle owner, one snapshot helper, design-system chrome, and a Features doc whose every claim is true — the only evidence four copies existed is git history.

#### What "Success" Concretely Means

- **Red-first tests:** the unmount-leak test *fails against today's code* by asserting listener identity (the existing count-based tests pass on the bug — that's the trap); gesture.ts gets throwing-activation and throwing-teardown tests proving the next drag still begins.
- **Grep deliverables with controls:** hand-rolled `pointermove` listeners in the renderer enumerate to exactly the documented deliberate set — zero in the four migrated files; `snapshotDirty` collapses to one owner; `var(--accent)` count in `sidebarDnd` is zero.
- **Gates:** typecheck, full Vitest, Biome at zero — exit codes read directly, never piped.
- **Live drags:** all six sidebar commit kinds, both modes plus a mode switch, cards, columns, options/status — one walkthrough handed to you at the end, not per-step ceremony.
- **The passes:** code-simplifier and comment-killer before "done," then a build-breaking attack briefed to *interleave* (drag × watcher push, drag × mode switch, drag × Escape-in-dropdown) — the crossing-mechanisms lesson.
- **Docs:** ContextPM lines 126–130 gone, 131 folded into [[PommoraDND]] as boundary, the doc's "adoption is partial" sentence rewritten in the commit that falsifies it. Written as always-so — no reversal narration.
- **Reported:** net code-only line delta (projection: meaningfully negative).

One expectation pinned again: the reorder snap-back you *feel* is the identity arc, deliberately outside this. This makes the drag layer clean, not that symptom gone.

[NATHAN]

Before doing this task, dispatch agents to hunt for opportunities to extend functionality where it isn't currently done that leaves this work comprehensive; and also looking in the existing location of the work for additional cleanup and DRY violations that must be handled, and consumers this output doesn't currently compose of, that SHOULD become consumers of this mechanism... Look across the board there, TableView, MarkdownPM, Navigation, Menus...

[CLAUDE]

Dispatching four read-only survey agents in parallel — one hunting every hand-rolled gesture lifecycle across the renderer (the should-be-consumers census), one auditing DRY inside the drag layer itself, one building the service-adoption matrix (autoscroll, announcements, spring-open, snapshot discipline), and one sweeping TableView, MarkdownPM, Navigation, Tabs, and the menu surfaces for places drag capability should exist but doesn't. Synthesis when they all report back.

- DISPATCH: Explore — Census hand-rolled gesture lifecycles
- DISPATCH: Explore — DRY audit of drag layer
- DISPATCH: Explore — Drag service adoption matrix
- DISPATCH: Explore — Missing drag capability sweep

- RETURN: (Census) every pointer gesture in the renderer classified — six NEW migration candidates (both `App.tsx` edge resizes, the column-width grip, Slider scrub, CalendarPicker range-drag, PhotoCropModal pan), each missing pieces the skeleton already gives for free (activate-on-pointerdown chief among them); confirmed the sidebar/`useOptionReorder`/`useStatusReorder` closure-identity leak by name and line, found the column drag has zero unmount teardown, and closed with an exhaustive "already on the skeleton" and "deliberately hand-rolled" ledger — nothing left unclassified.
- RETURN: (DRY audit) 24 files read whole and cross-compared — confirmed `groupingDnd`'s zero-listener staleness bug plus a smaller second instance in the GFM table and a third inconsistency in `tableDnd`; catalogued the measure-once snapshot pattern at 11 sites (6 already spelling `snapshotDirty` identically), four independent insertion-line spellings and a ghost component with two verbatim copies, the ACTIVATION/ghost-offset constants repeated 5–8 times each, four families of slot-scan math (one, `hiddenPaneModel`, a confirmed byte-for-byte copy of `paneDndModel` bar two substitutions), and Escape/pointer-id/`suppressNextClick`/editable-target inconsistencies across the board — then named thirteen things that should explicitly stay apart, with the reason each time.
- RETURN: (Adoption matrix) built the full surface × service matrix (autoscroll, announce, dragDisclose, `shared.ts`, scroll-invalidation, `keyboard.ts`, DragGhost) across all fourteen drag surfaces, then verified four gap classes firsthand — autoscroll missing everywhere a drag lives inside a real scroller (options, status, grouping pane, column drag, all mechanical), announce silent on every surface but the sidebar and the engine's keyboard path, dragDisclose registered only by `GroupBand` and bracketed only by `tableDnd`/`group.tsx` (`bandDnd`, `sidebarDnd`, and `groupingDnd` all miss it), and confirmed `groupingDnd`'s missing scroll-invalidation as a genuine wrong-target commit, not cosmetic drift.
- RETURN: (Missing capability sweep) corrected three false premises up front (table rows already drag from the whole row, the GFM table's rows already drag, the saved-views list already drags), then swept Tabs, Detail/Views, every menu surface, MarkdownPM, and SurfacePM for 22 numbered findings — split cleanly into mechanical extensions (Cards can't drag its own group bands though the table can; the fully-built, zero-consumer subfield reorder is "the readiest feature in the app") versus deliberate product declines (the recents-to-pins refusal, no cross-window tab drag, no cross-editor block drag) — and closed on cross-cutting notes: keyboard reorder exists in exactly one engine, no drag crosses a surface boundary anywhere, and where drag is absent there is no menu substitute either.

- BASH: Spot-check groupingDnd, subfield, GFM table, Slider claims
- READ: [Pommora/src/renderer/src/Detail/Views/Table/TableView.tsx]

Spot-checks done — `groupingDnd` genuinely has zero listeners of any kind (the staleness bug is real), `setSubfieldOrder` truly has no caller, the GFM table has no scroll re-base, and the Slider has no `pointercancel`. One agent claim I corrected on my own read: the column drag's stranded listeners self-clean on the *next* release anywhere — but that release can then **commit a stale reorder against an unmounted table**, which is arguably worse than a leak.

Here's the synthesis.

#### What The Sweep Changed

The four surveys confirmed everything already scoped and added three things: **real bugs nobody had flagged**, a set of **mechanical adoption gaps**, and a **product-candidate list** that's yours, not mine. Three premises also died on contact: table rows already drag from the whole row (the title-cell wish from earlier is already satisfied), the saved-views list already drags, and GFM table rows already drag. The drag layer is more built-out than the notes implied — the debt is narrower and deeper than "adoption is partial" suggests.

#### New Bugs Found (The "Not Even Found Yet" Pile)

- **`groupingDnd` commits to the wrong target after a mid-drag scroll** — it measures once at activation and never invalidates, inside a 280px scroller. Verified: the file contains *zero* event listeners. Every sibling surface guards this. Worst find of the sweep — a wrong-slot *write*, not a cosmetic drift.
- **GFM table drags resolve slots off by the scroll delta** ([Tables/TableView.tsx:194-196](Pommora/src/renderer/src/MarkdownPM/Tables/TableView.tsx#L194-L196)) — frozen origin, no scroll listener, same disease smaller.
- **Column drag mid-drag unmount** — no unmount teardown; the orphaned listeners fire on your next click and can commit a stale reorder through a dead view. Also: no Escape, and capture taken *before* the activation threshold.
- **Slider has no `pointercancel` at all** — an OS cancel leaves it stuck in drag state. The column-*width* grip reportedly treats cancel as commit (agent-found; I'll verify at the fix).
- **`tableDnd` misses the props-change invalidation** its three siblings carry — a watcher push mid-drag leaves frozen rects describing dead rows.

#### The Full Scope, Tiered

**Tier 1 — the consolidation core** (as already agreed): harden `gesture.ts` (now also: pointer-id filter, activate-on-pointerdown, and lost-capture abort hoisted from SurfacePM's sensor — the resize family needs all three), migrate the four lifecycle copies, cache `group.tsx` geometry, share the sidebar index. The sweep added two more copies to migrate: the **resize family** (both App.tsx edge resizes, the column-width grip, Slider, PhotoCropModal) — mechanical once activate-on-down exists, and it's what fixes the cancel bugs structurally. CalendarPicker stays out (needs the same `onTap` that blocks the MarkdownPM drags; that decline stands).

**Tier 2 — the new bugs above.** Mostly fall out of Tier 1 or are one-listener fixes.

**Tier 3 — DRY residue** (the washing machine): one snapshot helper (11 implementations, 6 identical — adoption is what *gives* groupingDnd its missing invalidation), chrome consolidation (the ghost has 1 component + 3 verbatim copies; the insertion line has 4 spellings, the sidebar's hand-freezing token arithmetic into literals), the `hiddenPaneModel` verbatim scan, the ghost-offset constant (5 sites), and one spelling each for the editable-target selector (currently 4) and the click-suppression rule (currently 4).

**Tier 4 — adoption gaps, all mechanical:** autoscroll for options/status/grouping/column-x (all verified trapped in real scrollers), `announce` for the eleven silent surfaces (the engine's *pointer* drags are silent too — only keyboard announces), spring-open for `bandDnd` and `groupingDnd` (both halves exist), and the sidebar (needs the row-registration side built — the one Tier-4 item with real new surface).

**Tier 5 — product candidates, your call, not cleanup:** subfield reorder (store action + persistence fully built, **zero UI** — the readiest feature in the app), tab⇄pin cross-zone drag, Cards group-band drag (the table can, Cards can't, the seam exists), outline-section drag, recents→pins (currently a *commented deliberate refusal* — stands unless you overrule). None of these ride along uninvited.

#### Honest Re-Size

Tiers 1–4 are the "no evidence left, machine cleaned" bar: **three focused sessions**, not two — the resize family and adoption gaps are what grew. Every claim above marked verified I checked myself; the two I didn't are named. Sequencing is fixed by dependency: skeleton first, migrations second, helpers third, adoption last — and the verification deliverables from before all stand, with one addition: the closing census must show the *only* hand-rolled lifecycles remaining are the seven documented-deliberate ones, enumerable by grep.

Greenlight shape: "Tiers 1–4" or name your cuts. Tier 5 wants its own conversation.

[NATHAN]

Agreed. Tier-1-4 I want you to scope out as part of the plan. Scope what can come first if it can; then sequence accordingly. Explain what the plan produces in plain english once it's produced. 

Look through the cited code yourself before creating the plan, then send agents to verify.

[CLAUDE]

Greenlit — Tiers 1–4 into a real plan. Loading the house plan-writing skill first, then reading every cited site myself, then drafting, then verification agents.

- SKILL: [writing-plans-v2]
- READ: [Pommora/src/renderer/src/App.tsx] -> [Pommora/src/renderer/src/Detail/Views/Table/TableView.tsx] -> [Pommora/src/renderer/src/design-system/components/Slider/Slider.tsx] -> [Pommora/src/renderer/src/Components/PhotoCropModal.tsx] -> [Pommora/src/renderer/src/SurfacePM/sensors/pointerDrag.ts] -> [Pommora/src/renderer/src/Components/Detail/groupingDnd.tsx] -> [Pommora/src/renderer/src/Components/Detail/paneDnd.tsx] -> [Pommora/src/renderer/src/Detail/Views/Table/tableDnd.tsx] -> [Pommora/src/renderer/src/Detail/Views/Table/bandDnd.tsx] -> [Pommora/src/renderer/src/Components/Detail/useStatusReorder.ts] -> [Pommora/src/renderer/src/design-system/interactions/shared.ts] -> [Pommora/src/renderer/src/design-system/interactions/a11y.ts] -> [Pommora/src/renderer/src/design-system/interactions/dragDisclose.ts] -> [Pommora/src/renderer/src/Components/Detail/DragGhost.tsx] -> [Pommora/src/renderer/src/design-system/interactions/autoscroll.ts] -> [Pommora/src/renderer/src/Sidebar/sidebarDndModel.ts] -> [Pommora/src/renderer/src/App.tsx] -> [Pommora/src/renderer/src/MarkdownPM/Tables/TableView.tsx] -> [Pommora/src/renderer/src/Detail/Views/GroupBand.tsx] -> [Pommora/src/renderer/src/Components/Detail/paneDndModel.ts] -> [Pommora/src/renderer/src/Components/Detail/hiddenPaneModel.ts] -> [Pommora/src/renderer/src/Sidebar/Sidebar.tsx]
- BASH: Read chrome CSS, tokens, engine announce sites, z-index claim -> List existing drag-layer test files and ACTIVATION comparison sites

Phase A complete. Writing the plan now.

- WRITE: [.claude/Planning/Drag Layer — Implementation Plan.md]
- BASH: Commit the drag layer plan
- DISPATCH: general-purpose — Verify plan citations against code
- DISPATCH: build-breaking-agent — Attack the drag layer plan

- RETURN: (citation pass) all 20 cited items checked against the actual code; 19 confirmed outright, one divergent (`usePointerGesture` is 8 files, not the claimed 10), plus three wording-risk observations — the ghost itself doesn't carry `var(--accent)` (only the insertion line/dot do), `engine.tsx`'s pointer listeners bind to the element rather than the window, and the sidebar's hand-spelled dot offset is off by half a pixel from the tokenized geometry.
- RETURN: (attack) eleven findings — one High, four Medium, six Low — plus three unknowns and twelve killed candidates. The High: Task 15 adopts the autoscroll service by signature rather than by precedent, giving four surfaces a scroll loop with no re-resolve, so the drop commits to the pre-scroll slot — the exact wrong-target bug class Phase 1 exists to kill, reintroduced in Phase 6. The Mediums: the skeleton gains no blur/lost-pointerup backstop even though two of the hand-rolls it's replacing already guard it; the resize migration's `activation: 0` isn't immediate activation, so a bare click strands the resizing flag; the Slider's cancel-revert can't reach its one live-preview consumer; and the card-board geometry cache is keyed on the frozen rects array while a zone's width has three other writers that never touch it. Also caught: a negative-control test written against a mechanism a later task replaces, four missing Made-False rows, a broken/blind derivation control, and confirmation that thirteen of eighteen tasks trace to the Goal while five don't because the Goal's own sentence never states those requirements. None of it needs architecture — every fix is a handful of lines.

- EDIT: [.claude/Planning/Drag Layer — Implementation Plan.md]
- BASH: Commit the folded plan revision
- BASH: Check ContextPM reformat impact on cited lines
- EDIT: [.claude/Planning/Drag Layer — Implementation Plan.md]
- BASH: Commit citation fix

Everything Nathan asked for this turn is done: the plan is written, committed, and has survived its first review round with all findings folded. Here's where things stand.

#### What Just Happened

I read every cited file firsthand (including the ones the surveys touched — two agent claims died on contact: the App.tsx resizes actually handle cancel correctly, and PhotoCropModal is fine), wrote the plan to the house format, committed it, then dispatched two verifiers as you asked. The **citation pass** confirmed 19 of 20 factual claims — one derivation count was wrong (8 files, not 10) and is fixed. The **build-breaking attack** returned 11 findings, 1 High — and the High one earned its keep: my autoscroll task copied the service call but not the precedent's *re-aim* half, meaning the list would scroll to reveal new slots and then **commit to the pre-scroll slot** — the exact wrong-target bug class this plan exists to kill, reintroduced by the plan itself. Every finding was verified, folded, and recorded in the plan's Log; none changed the architecture, and one actually *shrank* the plan (a suspected dead bounds check is confirmed dead — it gets deleted, not guarded). Your mid-turn requirements are baked in, and your ContextPM reformat landed mid-flight — the plan's citations now find those notes by content, not line number.

#### What The Plan Produces, In Plain English

**Six phases, 18 tasks**, at [Drag Layer — Implementation Plan.md](.claude/Planning/Drag%20Layer%20—%20Implementation%20Plan.md). When it's done:

1. **First, the three live bugs** — surfaces that aim your drop at the wrong row after a mid-drag scroll (the grouping pane's is a real wrong-write). These go first because they're standalone and they're the only actual misbehavior.
2. **Then the shared drag engine gets armored** — a crash inside any drag can no longer jam every drag in the app, a stray second finger can't steer one, and releasing the mouse while the app is unfocused can't wedge it.
3. **Then the four copy-paste lifecycles die** — sidebar, both reorder lists, column drag — each becoming a consumer of the one engine, which kills the leaked-listener bug class by construction. The column-width grip joins its twin, and a cancelled resize/slider now *reverts* instead of committing.
4. **Then the waste and duplication go** — the card board stops redoing geometry on every mouse move, and the ghost, drop line, snapshot ritual, and scattered constants each end up with exactly one owner.
5. **Finally, the missing comforts arrive everywhere** — lists that scroll when you drag past their edge, collapsed folders that spring open when you hover a drag over them (including the sidebar), and screen-reader announcements on every drag.

**Done means session-clearable**, and the plan now says so in its own Goal: the closing gate requires every finding fixed or ruled, every doc true, the history entry written, Tier-5 and every deferred item routed into ContextPM's standing sections, a neutral verifier plus a fresh attack pass, a hands-on walkthrough for you — and the plan document itself retiring from // Planning. Any handoff mid-plan must cite that full checklist as its Completion Criteria. Honest size: three focused sessions.

#### Two Things Are Yours Before Code Starts

- **Approval.** Per the gate, no implementation until you say go.
- **One interaction ruling** (only Task 14 waits on it): today, dragging a sidebar row and dropping it back where it started still fires the *click* — which navigates. My recommendation: any real drag (5+ px) swallows its click, uniformly, on every surface. Say "agreed" or give me your rule.

[NATHAN]

Is there a way to make the interaction ruling instead just recognize where it started and refuse the click itself? and would that be cleaner or honestly not.

[CLAUDE]

Good question, and it splits into two versions — one is genuinely cleaner than what I proposed, the other is worse. Depends what "recognize" means.

**If it means tracking *where* the drag started** — remember the origin row, and refuse a click that lands back on it — honestly not. Two reasons. First, the click after a drag doesn't reliably land on the origin: on capturing surfaces (sidebar) the browser retargets the synthesized click to the captured row, so it happens to work there — but the board deliberately doesn't capture, so its post-drag click lands on whatever common ancestor the release found. An origin-keyed refusal behaves differently per surface and misses the released-over-a-neighbor case, which would still click-navigate the *neighbor*. Second, it needs new machinery — origin tracking plus a location-aware click check — sitting beside `suppressNextClick()`, which is a second owner for the same fact. Your own hard rule kills that. And once you patch the neighbor hole, it converges back to "refuse any click right after a drag" anyway — the blanket suppressor, with extra steps.

**If it means the *system* recognizes "this press became a drag" and refuses the click itself — yes, and that's the cleanest shape of all three.** The one fact that matters isn't where the drag started or ended; it's that it *activated* — 5px of travel is drag intent, and a drag that returns home is a cancelled drag, not a click. And there's exactly one place that already knows that fact for every migrated surface: `gesture.ts` itself. Its release handler already branches on `wasActive`. Arm the existing suppressor right there, on every activated release, and every per-surface call and conditional (`if (!noop)`, `if (liveSlot)`…) just gets **deleted**. No surface decides anymore; there's no per-surface rule left to get wrong. The codebase even holds the precedent: SurfacePM's sensor already does exactly this — suppress on any armed commit.

I checked the consumers for a case where an activated release should still click through — there isn't one: taps stay clicks (never activated), Escape/cancel produce no click at all, and the resize surfaces retarget their click to a handle with no click action anyway.

So: the ruling dissolves. Task 14's arming half becomes ~4 lines *in* the skeleton plus deletions everywhere else — fewer lines than my per-surface version, one owner, uniform behavior. Your instinct was right; it just lives in the gesture engine, not in origin geometry.

If that settles it, say go — I'll fold the amendment into the plan and open Phase 1.

[NATHAN]

Forget what I said, I honestly don't know what I'm talking about. 
What I want you to do is confirm this, look at the updated Handoffs mandate and fill in the sections of Context.md as needed (current focus, immediate...) and write the handoff seeding NOW rather than later; exclude the transcript which you can send an agent to copy and return.

Once we're clean -- I want you to give me the "starting" info I need to know alongside a promise that once the plan completes, the full breaker + simplification rule runs, the History gets added, and the docs get fixed if needed. And the context.md current focus re-states what just happened and what's open rather than claiming work still needs to be done -- the job I'm giving you is to do all of it now.

[CLAUDE]

Understood — the ruling locks in as recommended (the skeleton recognizes the drag and refuses the click itself), and I'll do the full closeout of this session's state now: plan amendment, ContextPM sections, the seeded Handoff with the transcript delegated. Loading the handoff mandate first.

- SKILL: [handoff]
- BASH: Resolve session ID and transcript log path
- READ: [.claude/HandoffPM.md]
- EDIT: [.claude/Planning/Drag Layer — Implementation Plan.md]
- DISPATCH: transcription-agent — Archive retired session transcript

- RETURN: session `5d28593d` (the 08-08 write-path session) archived whole to `Sessions/Session - 08-08.md` at 1,287 lines — a single-day session, tag counts balanced, no compaction markers, transcript body diffed byte-identical against the source fence. `HandoffPM.md` trimmed to 69 lines ending in an empty fence, everything above the Session Transcript heading verified byte-identical against the pre-trim original.

- WRITE: [.claude/HandoffPM.md]
- READ: [.claude/HandoffPM.md]
- WRITE: [.claude/HandoffPM.md]
- EDIT: [.claude/ContextPM.md]
- READ: [.claude/ContextPM.md]
- EDIT: [.claude/ContextPM.md]
- EDIT: [.claude/Planning/Drag Layer — Implementation Plan.md]
- BASH: Commit plan ratification, handoff, and Context updates -> Commit the archived session transcript
- DISPATCH: transcription-agent — Transcribe this session into Handoff

Everything's done and committed. Here's your receipt, your starting info, and the promise.

#### Handoff Receipt

**Document:** `.claude/HandoffPM.md` · **Session:** `d2aff109` · **Shape:** retired-and-replaced

The 08-08 write-path session retired properly — its transcript archived whole to `Sessions/Session - 08-08.md` (1,287 lines, verified byte-identical), and the fresh document is written to the updated mandate: §Current Focus tells this session's story, §Completion Criteria carries your end-to-end mandate verbatim in checkable form (0 of 8 met — execution hasn't begun, which is the honest count). This session's transcript is rendering in the background; I'll fold it in when the agent returns. **Gate call: yes — Context moved in four places:** Current Focus now states what *happened* (scoped, surveyed, planned, reviewed, ratified) and what's *open* (execution), Immediate Work is one item — execute the plan — replacing the hardening paragraph the plan subsumed, and **all five Tier-5 candidates are in Next-Feature Candidates now**, not parked in a transient doc. The sweep removed nothing else; the Debt drag notes stay because they're still true of the code, and each dies in the commit that falsifies it.

#### Starting Info — What The Next Session Does

1. Read ContextPM (as always), then the plan's **Implementation Log** — it holds the settled click ruling, the review-round record, and two open notes.
2. Open **Phase 1, Task 1**: `groupingDnd`'s missing scroll invalidation — the one live wrong-write in the layer. Three small standalone fixes make up the phase; nothing in it touches the skeleton.
3. From there the plan is the sole task list, in order: skeleton hardening → the four migrations + resize family → card-engine caching → one-owner consolidation → autoscroll/announce/spring-open. Re-derive every count before editing; red tests before green.
4. Your ruling is locked and recorded: the gesture engine itself swallows the click after any real drag — no per-surface rules survive.

#### The Promise

Baked into the plan's Gate 6 + Closeout and the handoff's Completion Criteria — not as intentions, as unticked boxes that gate "done": the **build-breaking attack** runs against the finished work (after a neutral verifier separately adjudicates the delivery claim — two dispatches, never one), the **code-simplifier and comment-killer** passes run over the full diff, the **History entry** lands to format, **every doc** in the Made False table is rewritten in the commit that falsifies it, and the plan itself **retires from Planning** at close. My "done" on this focus means you clear the session and start whatever's next with zero strings — and any handoff written before that point must cite the full checklist, so a half-done state can't quietly call itself finished.

One boundary restated so future-you doesn't feel cheated: the reorder snap-back you feel daily is the identity arc, deliberately outside this plan. It'll still be there when the drag layer is spotless — and it's the natural next focus after.
`````
