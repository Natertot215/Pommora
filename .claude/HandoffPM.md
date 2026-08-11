## Handoff — Pommora

> **User Prompt:** *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence."*

#### Current Focus

**Session ID:** d2aff109-72c2-4191-89cd-dc2721762020
**Dates:** 08-09-2026 → 08-10
**Model:** Fable 5 (1M context)

**Documentation Normalization — closed (PM-095).** After the session's earlier arcs (PM-090 drag consolidation, PM-091 CSS token organization, PM-093 the token atlas — all recorded), Nathan scoped a purely-documentation pass: normalize every Feature doc to one standard, then carry it into Versioning and the PRD. The standard was derived from his own uncommitted exemplar edits (SymbolsPM, SurfacePM, MarkdownPM, PommoraDND) rather than invented — tables absorb their annotations, lists run tight, mechanism narration and the insistent register delete rather than reword, status lives in the tails — and he refined it live: prose colons and isolated sentences go, "so, X" clauses pass a "do I need this" test, and the `II.` heading prefix is conditional, sanctioned under a parent that describes the scope it enumerates.

Five inventory agents swept all 26 Feature docs against the charter; the findings became `Planning/Documentation Normalization.md` — the ratified standard, a per-file inventory, and a cross-doc ownership map. Execution ran receivers-before-donors in five cluster batches so no fact ever had zero owners, with `check-atlas.mjs` green at every commit and every commit pathspec-scoped around the live parallel session (which landed PM-092 and PM-094 mid-pass). A script derived each doc's codemap table of contents from its real headings; Chapter 2 rewrote Versioning to its Studio FORMAT and trued the PRD; and Nathan's mid-flight capture request folded PM-094's fallout into the atlas (`--radius-full`, `--state-drag`, the card-token merge, `separator.line`'s death).

Two closing reviewers hunted residue and dangling references over the finished tree; their ~70 findings were verified firsthand and roughly two-thirds folded — every broken pointer, the orphaned terms, the surviving register — with over-flags (philosophy copy, architecture-defining statements) deliberately kept. The tail order normalized to Known Issues → Pending → Prospects on Nathan's "yes, fix it," PM-095 is filed with the Context updated, and everything stands committed through `e45cd082`. Documentation diff: Net +94 | +1,176 / −1,082, actionable zero.

#### Completion Criteria

- [x] The standard ratified in `Planning/Documentation Normalization.md`, with Nathan's charter amendments ("so" test, conditional `II.`) folded.
- [x] All 26 Feature docs conform — register, ownership moves, tails, ToCs — committed in five cluster batches, atlas checker green at each.
- [x] MarkdownPM's Non-Obvious traps relocated to `Guidelines/Editor-Internals.md`, on the CLAUDE.md map.
- [x] Chapter 2: Versioning in its Studio FORMAT; the PRD trued (stale renderer claim, Space block-doc contradiction, completed Prospects out).
- [x] The residue review dispatched, verified firsthand, and folded; PM-094's tokens captured into the atlas.
- [x] Tail order canonical (Known Issues → Pending → Prospects) across every doc and ToC.
- [x] PM-095 written to History-Format; Context's focus and Recent Work restated. **Every criterion met; the session's work is finished.**

#### Next Session

- The next session opens on a **fresh pick** from Context §Pending Focuses — the standing options are current there, with the **identity/order-persistence arc** and the **subfield reorder** named as the two nearest doors. Open with a fresh read of the options rather than this session's ranking.
- One deferred call: deploying the ratified charter into Studio-Documentation.md's empty §Features section as the Studio-wide standard — held until the standard has survived some living-with.

#### Feedback

- "My main frustration is that these docs state what isn't obvious… when it could just be removed entirely." (the ratifying frustration — the mechanism-narration class deletes, never rewords)
- "'So' isn't BANNED, it's just 'do I need this'."
- "II. is acceptable if it's a sub-scope; something like Property Types would allow II. under the general properties description heading — it's conditional and where it makes sense."
- "Please execute this plan with a subagent pass to catch any weird or 'why tf would anyone need to read that' stuff."
- "Please look back at the recent changes within the CSS, radius, etc… and capture."

#### Session Pointers

- `Planning/Documentation Normalization.md` — the ratified standard, per-file inventory, and ownership map; kept as the charter's home until it deploys Studio-wide.
- `Guidelines/Editor-Internals.md` — MarkdownPM's internal invariants, relocated from the dissolved Non-Obvious annex.
- `node scripts/check-atlas.mjs` (from `Pommora/`) — the gate every doc commit runs; 20 tables green.
- [[HistoryPM]] §PM-095 — the record; commits `8c291b83..20f3dfcd`.
- The canonical doc shape: `## Name` → codemap ToC → lede → `###` sections (`#### II.` only under a describing parent) → Known Issues → Pending → Prospects.

#### Working Notes

- `check-atlas.mjs` skips bare numeric literals under 8, so a value change like `--state-disabled` 0.4 → 0.5 passes silently — truing those means reading the code commits, not trusting the green.
- A parallel session ran the whole pass (PM-092, PM-094, and Nathan's own edits); bare `git commit` takes the whole shared index, so every commit here used `git commit -- <paths>`. An outside editor save can also overwrite a script-inserted block — DesignSystemPM's ToC vanished that way once and was re-added.
- The ToC blocks are script-derived from real headings; on any restructure, regenerate rather than hand-edit (the generator pattern lives in this session's transcript).

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
- RETURN: Confirmed the pre-compaction transcript split cleanly — the drag-layer arc (scoping, the four-agent survey, the plan, its review rounds, and the full six-phase execution) now lives whole in the new `Session - 08-09 > 08-10.md`, and the live Handoff fence was trimmed to match, both verified line for line.
- BASH: Spot-check the split landed -> Final handoff commit with explicit paths

[CLAUDE]

**Receipt:**

- **Document:** [HandoffPM.md](.claude/HandoffPM.md) · Session `d2aff109` · **continued** (same ID through two compactions)
- **Focus:** two arcs, both closed with every criterion met — the drag-layer consolidation (PM-090, hand-confirmed) and CSS Token Organization (PM-091, closed through /closeout). The criteria list now carries eleven ticks and zero open boxes.
- **Sweep:** removed the stale mid-session-reformat working note and the plan-era pointer phrasings; the pre-compaction transcript retired whole to `Sessions/Session - 08-09 > 08-10.md` (747 lines, tag counts verified 19/19 across the split) — the handoff's fence now opens at the compaction and carries the DND verification + CSS arc, per your instruction.
- **Gate:** Context changed — §Current Focus (CSS arc closed, next session picks fresh), §Recent Work (PM-091 in, PM-086 out), §Debt (the `--text-dim` bullet narrowed to the one real decision). HistoryPM holds PM-091 at `a0095299^..3560fdf4`, Net −21.
- **Your mid-turn asks, both done:** `--text` resolved NOW — it collapsed onto `--label-primary` because their composites were already indistinguishable (committed `3560fdf4`, gates green). `--text-dim` could not be resolved honestly: it's a 50% white and your ramp's tiers are 65% and 35%, so any mapping visibly shifts nine empty-state surfaces — the bullet now states exactly that choice and nothing else.
- **Commits this close:** `f72eea16` (DropLine) · `4a8f80eb` (PM-091 docs) · `3560fdf4` (--text) · `f2e2745e` (handoff + archive). Tree holds only your three doc edits, unstaged as always.

Next session opens clean on a fresh pick — subfield reorder if you want a fast win, the identity arc if you want the snap-back dead. Nothing from these two arcs follows you there except one `--text-dim` decision that takes thirty seconds and a pair of eyes.

[NATHAN]

Commit the docs and explain what text-dim is and the “what” behind current consumers; and where it lives and reaches

- BASH: Commit Nathan's docs; read every text-dim consumer's context -> Identify the selector each dim consumer belongs to

[CLAUDE]

Your docs are committed at `eb9c7b63`. Here's `--text-dim`, fully mapped:

#### What It Is

A single declaration in [styles.css:7](Pommora/src/renderer/src/styles.css#L7) — pure white at 50% opacity. It's shell-era vocabulary: the open/loading/empty states were styled before the label ramp existed, and this was their hand-picked "quiet text" tone. Its sibling `--text` turned out to be a pixel-identical twin of `--label-primary` and died this session; `--text-dim` survived because it genuinely isn't in the ramp — your label tiers are **65%** (secondary) and **35%** (tertiary), and 50% sits square in the gap. On the window background that's a real visible difference in both directions: secondary reads noticeably brighter, tertiary noticeably fainter.

#### Where It Lives and Reaches

Declared once in the shell's `:root`, so it *reaches* everywhere — but its actual consumers are only plain CSS files: the shell, the sidebar, the Detail pane, and the table layer. Nothing in the design system or any `.css.ts` recipe touches it. It's a parallel vocabulary that never crossed into the token system.

#### The Nine Consumers — Two Families

**Empty/loading text (6 sites)** — all "nothing here yet" copy:
- `.state` + `.state-detail` (styles.css) — the sidebar Surface's open/loading/error message and its small sub-caption, shown before a nexus is ready
- `.detail-empty`, `.detail-placeholder`, `.detail-detail` (Detail.css) — the main pane's centered no-selection state and its caption
- `.table-empty` (Table.css) — the "No pages here / Loading…" line inside a table view

**Resting structural chrome (3 sites)** — quiet glyphs and headers:
- `.group-band-twisty` / `.group-band-add` (GroupBand.css) — the group band's disclosure chevron and its hover-revealed "+"
- The table-scoped twisty override (Table.css)
- `.section-header` (Sidebar.css) — the sidebar's section headings

#### The Actual Decision

The two families arguably want *different* tiers, which is why this wasn't mechanically resolvable: empty-state text is classic secondary-label material (65% would make it slightly more readable), while resting glyphs and section headers lean tertiary (35%, quieter chrome). The three honest options: **split it** — states → `--label-secondary`, chrome → `--label-tertiary`, delete the variable (my lean: it dissolves the orphan into your existing vocabulary, at the cost of two visible-but-small shifts in opposite directions); **promote it** — mint a 50% tier into the ramp and keep all nine as-is (zero visual change, but the ramp gains a tier only these nine justify); or **map all nine to one tier** and eat one uniform shift. Whichever you pick, it's a ten-minute change — the bullet exists purely because the *look* is yours to call.

[NATHAN]

1. section-header should actually be label-tertiary regardless; fix that now.
2. group-band-twisty / group-band-add should be tertiary too

—

--text-dim's existing consumers after this should just be --state-(current “inactive”) of label-primary.

Idk what our current equivalent of “inactive” is for --state, please tell me what exists before presenting options. Do the first changes first regardless

- BASH: Section header and band glyphs to label-tertiary

[CLAUDE]

Chrome family converted — only the six text sites still read `--text-dim`. Now the vocabulary answer:

- BASH: Read the full state-token vocabulary and tint values -> Lint and commit the tertiary conversions

Done and committed at `89dd0120` — the sidebar section headers, both band glyphs, and the table's twisty override all read `--label-tertiary` now.

#### What `--state` Actually Holds Today

| Token | Kind | Value | Meaning |
|---|---|---|---|
| `--state-hover` | fill color | grey wash, lighter | the hover background |
| `--state-selected` | fill color | grey wash, heavier | the selected background |
| `--state-muted` | veil color | black at low alpha | a de-emphasis veil painted *over* content |
| `--state-ghost` | opacity | `--tint-primary` = **0.6** | the drag-source's in-place fade |
| `--state-disabled` | opacity | **0.4** | a present-but-inert control's dim |

**There is no "inactive" today** — that's the honest answer. The two opacity states both mean something else: ghost is "this is being dragged right now," disabled is "this control can't act." An empty-state *message* is neither; using either would be semantic borrowing, which is how `--drag-muted` happened.

Two facts that shape the options before you pick:

- **The math:** `--label-primary` is ~91% white. At ghost's 0.6 it lands at ~55% effective — very close to `--text-dim`'s current 50%, a barely-visible brighten. At disabled's 0.4 it lands at ~36% — essentially `--label-tertiary`, much dimmer than today.
- **The mechanism matters:** `opacity:` on the element can't be the tool here, because `.state-detail` sits *inside* `.state` — nested opacities compound (0.6 × 0.6 ≈ 0.36 on the caption). The dim has to live in the color itself: `color-mix(in srgb, var(--label-primary) N%, transparent)`, exactly how the tint ramp already dims things.

**The options, now that the vocabulary is known:**

1. **Mint `--state-inactive`** — a color-level dim of `--label-primary` via color-mix, sitting in the state family beside ghost and disabled, consumed by the six empty-state sites, `--text-dim` deleted. This is your stated instinct and it's clean; the only knob is the percentage: **55%** reproduces today's look almost exactly, **60%** aligns it with the tint-primary step ghost already uses (a touch brighter).
2. **Skip the new token, use `--label-secondary`** (65%) — no new vocabulary, but visibly brighter than today across all six sites.

I'd take option 1 at 60% — it gives "inactive" a real name, and tying it to the same step as ghost means the system has one "primary de-emphasis" amount instead of two near-identical ones. Say the word and the percentage, and `--text-dim` dies in the same commit.

[NATHAN]

I think --state-muted is the best option here; existing consumers just become label-primary at state-muted.

- BASH: Find state-muted's actual consumers

[CLAUDE]

Hold on — this one I have to push back on with the numbers, because `--state-muted` isn't what its name suggests here.

**What `--state-muted` actually is:** `black at 10%` — a *surface veil*. Its three consumers all paint it as a `background` over content (the Cards dim, the nav gallery dim, SidePane's scrim). It has never been a text treatment, and its 10% is calibrated for "barely shade a whole surface," not "dim a label."

**What "label-primary at state-muted" computes to:** label-primary is ~91% white; washing it with 10% black lands at **~82% effective white**. Today those six sites sit at **50%**. So this mapping doesn't mute the empty states — it *brightens them dramatically*, to brighter than `--label-secondary` (65%), nearly indistinguishable from normal body text. "No pages here" would read at almost full strength.

That's the opposite direction of everything you've said about these sites, which is why I'm stopping instead of shipping it. The name fits your intent; the value doesn't.

Two ways to reconcile, your call:

1. **You actually want them that bright** — then I apply it as written (`color-mix` of state-muted into label-primary, no compounding issues) and the empty states visibly step up to ~82%. Legitimate if your intent is "empty states shouldn't whisper."
2. **You want "muted" as a concept at roughly today's quietness** — then the state family is missing its text-dim member, and the right move is the one from before wearing the name you just picked: mint the token (as `--state-inactive`, or even name it into the label ramp), defined as label-primary mixed to ~55–60%, six consumers, `--text-dim` deleted. Same shape as your ruling, honest value.

Which is it — the 82% you'd literally get, or the quiet tone with a proper name?

[NATHAN]

keep today's locations at label-tertiary HOWEVER add the verbatim comment.

// Awaiting proper inactive state token.

Then, I think this is a perfect opportunity to actually violate the HARD RULE of the documentation. These values haven't changed in a while and should be able to start being able to cite code so that Nathan and Claude can have a clear idea of what Variables exist.

I want you to scope out a complete reconnaissance that would rewrite DesignPM, while also potentially retiring the guidelines. This document would rename DesignPM into DesignSystemPM.

What I'd want is a complete "Guide" to Pommora's design system that includes tokens and variables not limited to but must include an H4 header with a brief description, followed by either a codemap or a table that explains the title/variable, the token, or the raw hex in such case it has one.

So a section would be

#### Surfaces

Window
Surface Primary | sf-primary | 202022
Surface Secondary | sf-secondary | 2A2A2E
Surface Tertiary | sf-tertiary | 3A3A3E

#### Primitives

White | system-white | HEX
Grey | system-grey | 71717A
Black | system-black |101010 

#### Labels

Label Primary | label-primary | system-white(100)
Label Secondary | label-secondary | system-white(60%)
....


This way we can have a complete reconnecence of what exists where, while potentially catching stragglers, and making the documentation more usefull.. Look for stuff like

states, fills, solids, tints, seperators, ect...

Additionally, as an idea, if maintaining a mirror-map-like system where changing the doc itself would change the actual color so that I can change it directly from the markdown, that would be cool too. But I think this grounding is long overdo.

- BASH: Six sites to label-tertiary with the marker comment; alias deleted
- EDIT: [.claude/ContextPM.md]
- BASH: Lint and commit the text-dim retirement

[CLAUDE]

`--text-dim` is dead — six sites read `--label-tertiary` with the verbatim marker, alias deleted, committed at `63887574`, and the Context bullet now tracks only the mint.

#### The DesignSystemPM Reconnaissance — Scope

**What it becomes:** `DesignPM.md` renames to `DesignSystemPM.md` and gains a complete token atlas — the existing narrative (materials, menu surfaces, primitives-and-aliases philosophy) stays as prose, and beneath it every family gets your H4 + table treatment: `Title | token | value`, raw hex where one exists, derivation notation where the value is derived (`system-white @ 65%`), and the CSS-var bridge name where one is emitted.

**The families the recon sweeps** (each one source-verified, not recalled):

- **Primitives** — `system-white/grey/black`, `WINDOW_BG`, the spectrum solids (from `color.css.ts` + `@shared/theme`)
- **Surfaces** — window/primary/secondary/tertiary fills
- **Labels** — the four tiers + `control`
- **States** — hover, selected, muted, ghost, disabled, and the awaited inactive slot marked as such
- **Fills, Separators, Tints** — the grey-alpha ramp, hairlines, `TINT_STEPS`
- **Shadows** — standard + lift
- **Chips** — the chip color/pill system (`chip.css.ts`, `colorMap.ts`)
- **Type ramp** — the typography aliases and what each composes
- **Motion** — durations, easings, the named beats (`motion.ts`)
- **Stack** — the z-order ladder (`stack.ts`)
- **Geometry** — `size.css.ts` (icons, controls, `DISCLOSURE_INDENT`, `DROP_LINE_INSET`), the drag-chrome dimensions
- **The bridge map** — every `--var` `theme-vars.css.ts` emits, and who it aliases
- **Scoped knobs** — the deliberate non-globals, each with its scope named: `table-tokens.css`, the autoscroll `:root` block, `Carets.css`, `--mdpm-scale`, the frost params

**The straggler hunt rides along:** the same sweep greps for raw hexes and hand-rolled values *outside* the token files — exactly how `--text-dim` and `--drag-muted` got caught. Anything found gets a table row flagged as a straggler or a fix, not silence.

**The rule violation, done properly:** "Docs name; code holds exacts" stays the law everywhere else — so the new doc opens with a one-line charter naming itself the sanctioned exception, and the CLAUDE.md hard-rule line gains the exception clause. Without that, every future audit re-flags the doc as a violation and someone helpful "fixes" it.

**Design-Sources.md:** its don't-duplicate rule folds into the new doc's charter (the atlas *is* the "what already exists" answer, better than prose ever was); the guideline file retires. That's my recommendation — recon confirms nothing else lives there first.

**Drift control — and your mirror-map idea, honestly assessed:** exact values in docs buy drift, so the doc ships with a small checker script (`scripts/` beside the showcase tooling) that parses the tables and diffs them against the token sources — run on demand or as a gate, it turns "the doc lies" from a silent state into a red exit code. Full **write-back** (edit the markdown hex, the token changes) is genuinely buildable on top of the same parser, but only leaf values are unambiguous — editing a *derived* row like `label-secondary | system-white @ 65%` has no single write-back target. So: checker first; one-way doc→code write-back for raw-hex rows as a follow-up once the table format has proven stable. Not built until you say so.

**Shape and cost:** one session. Two Explore agents sweep (token sources + straggler grep), I write the doc from their verified inventory, references reconcile (the CLAUDE.md codebase-map row, every `[[DesignPM]]` cite), checker script last, PM-092 records it. Say go and the sweep dispatches.

[NATHAN]

also include places like MarkdownPM so we can gather tokens there too, it has its own tokens and design that should be considered since they're tokens too.

[CLAUDE]

MarkdownPM's in — and it generalizes: the atlas gains a **Feature Tokens** tier for every per-feature token pocket (`--mdpm-*` and the editor's scale/zoom properties, the outline-rail knobs, SurfacePM's tile vars, the `--ppane-*` contract, `table-tokens.css`, the nav-list knobs, the caret family). Those are tokens with a deliberate scope, and the doc records each family *with* its scope — that's exactly the class the `--drag-muted` bug lived in. Dispatching the read-only recon now; the write starts when the inventories are back:

- DISPATCH: Explore — Inventory design-system core tokens -> Explore — Inventory feature token pockets and stragglers

Noted — every table gets a **SOURCE:** `filepath` line under its H4, which also makes the checker script's job trivial: each table declares exactly which file it must agree with, so verification is per-table rather than a fuzzy global diff.

Both recon agents are out on Opus — one walking the design-system core (every family in `tokens/`, materials, the theme-vars bridge, `@shared/theme`), one sweeping the feature pockets (MarkdownPM's editor tokens and scale properties, Carets, table-tokens, SurfacePM, `--ppane-*`, nav knobs, the shell's `:root`) plus the straggler and scope-hazard hunts with named greps. Your "agreed" also locks in the Design-Sources retirement and the checker script, so the write plan when they return is: `DesignSystemPM.md` (rename + charter + atlas), the CLAUDE.md hard-rule exception clause, Design-Sources folded and retired, references reconciled, checker in `scripts/`, PM-092. I'll start the moment the inventories land.

- RETURN: Returned the design-system core token inventory — every primitive, surface, label, state, fill, tint, shadow, chip, type-ramp, motion, stack, and geometry value read directly from its source file, with each value's literal and origin cited.

The core inventory is in — and it's exactly the grounding you wanted. Headlines while the pockets agent finishes:

- **Complete families captured with literals:** primitives, surfaces, labels, states, fills, separators, tints, the ten spectrum solids, shadows, the full chip system (shapes, melt machinery, twelve color variants, five knobs), the 11-step type ramp × four weights, motion, the three z ladders, geometry bundles, both glass systems (frost params *and* the liquid-glass shader tuning), and the entire theme-vars bridge map — every `--var` with what it aliases.
- **The doc-drift case makes itself:** `tokens/README.md` describes a file layout that *doesn't exist* — it names six files (`primitives.css.ts`, `space.css.ts`, `radius.css.ts`…) of which none are real. The atlas replaces it.
- **Ten comment-vs-value contradictions** logged — e.g. "states are system-grey" sitting directly above a system-*black* value, and the frost comment claiming "pane-tuned params" over what is actually a single 5-point brightness delta.
- **A dead-and-unbridged census:** several bridges have zero consumers (`--system-grey`, `--tint-solid`, four of five icon-ladder vars, four spectrum vars), `easing.out` is dead end-to-end, and the top type-ramp steps have no product consumers. My lean, per your pre-scaffolding rule: the atlas *marks* live vs. unconsumed rather than pruning — a ramp is a vocabulary, and partial bridging was the inconsistency, not the completeness. Your call rides the review.
- One subtle trap the atlas will document: the autoscroll knobs score zero on any `var()` grep because JS reads them via `getComputedStyle` — a naive dead-token audit would kill six live knobs.

Once the feature-pocket agent reports (MarkdownPM's editor tokens, Carets, table-tokens, SurfacePM, the scope-hazard hunt), I write `DesignSystemPM.md` with per-table **SOURCE:** lines, retire Design-Sources and the false README, amend the CLAUDE.md hard-rule exception, and wire the checker script.

- RETURN: Returned the token inventory for values living outside `design-system/tokens` — coverage greps across the renderer with hit counts, plus the feature-pocket token families and straggler hunt results.

Both inventories are in — including one live bug the hazard hunt caught (`--card-min`'s KNOB has *never worked*: the gallery's own 180px declaration sits closer in the tree than navView's 220px knob). Verifying that firsthand, then building the doc:

- BASH: Verify the card-min shadowing and switch-zoom orphan

[NATHAN]

My recommendation is DesignSystemPM follows

Primitives
Spectrum
Labels
States
Fills
Tints
Separators
Shadows
Spectrum
Geometry
Materials

MarkdownPM.md gets

#### Design System

Typography has its stuff properly documented too, 
Motion goes to Interaction.md alongside carets, edge-fade, and autoscroll

Chips go to PropertiesPM.md
Cards go to CardView (not navigation; Navigation.Md just states that it uses those)

PagePreview.md contains the description rather than verbatim, 
TableView gets its proper documentation.

Stack stays excluded, so does shell, small pockets, etc...

Switches, Toggles, Chevrons, etc.. get described in DesignSystem.md rather than fully recited.

[CLAUDE]

Routing locked — the atlas distributes to where each family's consumers actually live, DesignSystemPM keeps the core vocabulary, and the bridge names fold into each table as a column instead of a standalone section. Executing:

- BASH: Rename DesignPM to DesignSystemPM
- WRITE: [.claude/Features/DesignSystemPM.md]
- BASH: Heading structure of the seven satellite docs
- READ: [.claude/Features/TypographyPM.md]
- EDIT: [.claude/Features/TypographyPM.md]
- BASH: Read InteractionPM Timing Sources for placement
- EDIT: [.claude/Features/InteractionPM.md] -> [.claude/Features/MarkdownPM.md] -> [.claude/Features/PropertiesPM.md] -> [.claude/Features/CardViewPM.md]
- BASH: Read NavView and NavWindow sections for placement
- EDIT: [.claude/Features/NavigationPM.md] -> [.claude/Features/PagePreviewPM.md] -> [.claude/Features/TableViewPM.md]
- BASH: Locate all citations needing repoints -> Repoint DesignPM citations
- EDIT: [.claude/CLAUDE.md]
- BASH: Read Build-Gotchas structure -> Fold the unique lessons into Build-Gotchas; retire Design-Sources -> Read the false README before rewriting
- WRITE: [Pommora/src/renderer/src/design-system/tokens/README.md]
- BASH: Check what the README rewrite dropped
- EDIT: [Pommora/src/renderer/src/design-system/tokens/README.md]

Now the checker. Writing it, then running it against the real tables — it has to go green on what I just wrote:

- WRITE: [Pommora/scripts/check-atlas.mjs]
- BASH: Run the atlas checker against the new tables
- EDIT: [Pommora/scripts/check-atlas.mjs]
- BASH: Patch SOURCE lines; re-run checker

**20 tables, all green.** The checker verifies the entire distributed atlas. Closing the arc — Context, PM-092, gates, commit:

- EDIT: [.claude/ContextPM.md]
- BASH: Check Recent Work current shape -> Check HistoryPM numbering and the parallel entry -> Fix the Current Focus entry reference -> Check the focus line's current reference text
- EDIT: [.claude/ContextPM.md] -> [.claude/HistoryPM.md]
- BASH: Gates plus the atlas checker -> Commit the code side; count script lines -> Assess the shared-index sweep damage
- EDIT: [.claude/HistoryPM.md]
- BASH: Pathspec-commit only the atlas docs -> Add report to index, pathspec-commit the atlas docs

The atlas is landed. Full accounting, including the collision:

#### What Shipped

- **[DesignSystemPM.md](.claude/Features/DesignSystemPM.md)** (renamed from DesignPM) — the charter naming itself the sanctioned docs-hold-exacts exception, the narrative carried over, and the core atlas: Primitives, Surfaces, Labels, States, Fills, Tints, Separators, Shadows, Spectrum, Geometry, Materials — every row `Title | token · --var | value`, every table under a **SOURCE:** line. Component chrome (switches, chevrons, grips, ActionBand, the dropdown shell) is described, not recited, per your cut.
- **Satellites:** MarkdownPM gained its Design System section (the editor's eleven scoped families — scale, lists, rail, quotes, callouts, code, syntax colors, embeds), TypographyPM's ramp now states its literals, InteractionPM holds motion + caret + edge-fade + autoscroll, PropertiesPM holds chips, CardViewPM the card family (NavigationPM states it consumes them), TableViewPM the table sheet, PagePreviewPM describes the `--ppane-*` contract in prose.
- **The checker:** [check-atlas.mjs](Pommora/scripts/check-atlas.mjs) parses every SOURCE-tagged table across the Features docs and verifies identifiers and literals against the named files, with the theme-vars bridge as implicit source for `--` handles. **20 tables checked — all agree with source.** It caught ten real discrepancies in my own first draft before going green, which is the proof it works.
- **Plumbing:** the CLAUDE.md hard rule carries the exception clause naming the checker; Design-Sources retired (charter folded into the atlas opening, the parallel-write-agent lessons into Build-Gotchas); the tokens README no longer describes six files that don't exist; PM-093 filed; the fix material lives in [CSS Duplication Report.md](.claude/Planning/CSS%20Duplication%20Report.md) as your next cleanup session.

#### The Collision, Plainly

Your parallel session had its grip-menu work *staged* in the shared index, and my `b3f49b23` commit swept that staged snapshot in — `git add <paths>` + bare `git commit` commits the whole index, which explicit staging alone doesn't protect against. So `b3f49b23` is mislabeled: titled tooling, it also carries a mid-flight grip-menu snapshot, and I could not gate that snapshot independently — the other session's own gates own it. The docs commit after it (`0a4a19d1`) used the actually-safe form — `git commit -- <paths>` — which ignores the index entirely; that's the tool I'll use for every commit near a live session from now on. Their three still-evolving code files remain untouched in the tree for them. If you want `b3f49b23` split into clean halves once the grip session finishes, pause both sessions and I'll redo it surgically — it's local-only, so it's cheap while unpushed. Also: the atlas took **PM-093** because the parallel session had already claimed PM-092, and its finished doc entries rode my docs commit under the bundling rule.

**Gates at my last clean checkpoint:** lint 0 (734 files) · typecheck 0 · atlas 20/20. The one thing this arc leaves open is by design: the duplication report's checkboxes, waiting as their own session.

[NATHAN]

Please professionalize the MarkdownPM document; right now it's VERY bloated, and I feel as if it could simply be re-formatted so that it's more product documentation rather than an exact explanation of mechanisms. Duplication, unclear ownership in headings etc....

- READ: [.claude/Features/MarkdownPM.md]
- WRITE: [.claude/Features/MarkdownPM.md]
- BASH: Diff stats and pathspec-commit the rewrite

[CLAUDE]

Done — committed at `879f15d5` (pathspec commit, parallel-session-safe), net −30 lines with zero facts lost. What changed structurally:

**Heading ownership fixed.** Hover Previews and Page Embeds were filed as `#### II.` subsections *under Tables* — they're editor features, not table features. Both are now their own `###` sections. Block Drag absorbed the grip menu under one honest title, since the grip *is* the drag handle's second job.

**One owner per fact.** The worst duplications collapsed:
- The fence-identity law was stated in full twice (the Code bullet and Non-Obvious) — the bullet now states the behavior in one sentence and defers the law to Non-Obvious, which owns it.
- Connection/link wiring was explained three times (Constructs, Host Services, Non-Obvious) — Constructs owns it now; Host Services just points there; the redundant Non-Obvious entry merged away.
- The caret was described in Constructs *and* Module Shape — Constructs owns it.
- The embed guards were narrated across three paragraphs plus a Non-Obvious entry — the grammar paragraph owns the product behavior, Non-Obvious owns the one-claim-set trap.
- The grip right-press mechanism moved out of the body into Non-Obvious where implementation traps live.

**Tone shift.** Mechanism narration became product statements — e.g. the Lists bullet dropped "which is what makes re-picking the current type inert and picking Numbered over a broken sequence a repair"-style reasoning chains and now states what the feature does. Everything genuinely load-bearing (the CRLF fence trap, `ignoreEvent`, the UTF-16 rule, the wrap-span warning) survived intact in Non-Obvious — those are the hard-won traps the docs exist to keep, so professionalizing meant *relocating* them, never cutting them.

The atlas section, Known Issues, and Deferred are untouched, and the checker still reads its tables (SOURCE line preserved). One note: the doc's fresh grip-menu content from the parallel session was condensed with the same discipline but every fact kept — if that session is still extending MarkdownPM.md, it'll want to pull before its next doc edit.

[NATHAN]

/compact


|| COMPACTION ||

[NATHAN]

I want you to take this session with the scope that this is PURELY a documentation pass. What I want is to normalize the documentation standards across these docs. For example, from recent commit of docs, I've been making some edits which give guidance to the type of information these docs should and should not contain, the language they should and shouldn't use, and the type of appropriate structure.

Please inventory the Feature docs in a way that can be edited per-file to actually follow the structure that each needs.

This is a multi-phase effort that must ground in HOW these docs should be written, then finding the actual sources. It shouldn't just regurgitate findings, what can be inferred or found in the codebases verbatim code or comments, and read as professional documentation with the Known Issues and Deferred being the appropriate place for pending-work or unprofessional detail.

These insights gained from the Codebase and Docs should also feed a Chapter 2 of this session which would focus on Versioning, and PommoraPRD itself.

--

My main frustration is that these docs state what isn't obvious as in describes something like "The hover flag that keeps the generic editor menu out of the gutter reads the same grip-bearing line-class list as the menu's hit-test, so the two can't disagree."

When it could just be removed entirely. That's one example.

Please scope these out while also considering the following preferences.

---

- **Avoid Absolutes:** Avoid writing unnecessary absolutes or double negatives such as “this is true, never that” when “this is true” can be interpreted the same way — don’t assert claims as locked; claims should be written neutrally.
- **Audience:** Write documentation as appropriate for official product documentation for a company. 
- **Replace** incorrect information — don’t add amendments, supersedes, or additional notes to fix framing; either remove it entirely or correctly restate it if it genuinely remains relevant. 
- **Silence** also *isn't* inherently contradictory — simply removing an untrue statement is often more appropriate than attempting to reframe it as true; omitting genuinely unimportant or trivial details is usually more sustainable in the long-run than recording absolutely everything. 
- **Neutrality:** Avoid emphasizing failure-prevention framing when something's purpose can be described neutrally or through value-creation instead; explain what something does in a way where its purpose is self-evident.
- **Professionalism:** Write through encyclopedic-neutral and grammatically correct conventions; full terms, connective phrasing, natural advancement of ideas, and documentation-appropriate structure. Avoid agent-hand language such as fragmentation, fact-stacking, single-clause statements, and re-emphasizing established points — documentation *shouldn't* read like you're trying to convince anyone of its claims.
- **Tense:** Consider the time-specific implications of what you're writing — session-specific or historical documentation should avoid variable claims and use past-tense framing, while tense-neutral or forward-tense documentation should remain just that.
- **Specificity:** Feature and status-agnostic documentation should describe current state neutrally and assertively; however, it’s important to avoid over-specification, exhaustive enumeration, or similar highly subject-to-change details with real risk of becoming outdated or inaccurate given a project’s natural tendency to change and evolve. This isn’t an excuse to be lazy or vague; it’s a reminder that over-detailing often manufactures more opportunity for contradictions if things change.

---
ADDITIONAL DETAILS

- not every heading needs a sub-heading; for example a sentence that describes the table below doesn't need to be added below a heading when the table is self-evident.
- the II. Prefix isn't required at all, instead, I'd like to experiment with having each doc contain a table of contents in codemap format, without the hashtags; that's an experimental choice; it would come below the first heading of the document, no pre-amble, just structure.

Normalizing formatting standards needs to be scoped here too.. what gets spaced lists versus what doesn't, Table headings need to be Capitalized etc...

[CLAUDE]

Scoping it properly — this needs grounding in what you've actually been correcting before anything gets inventoried. First move: pull your recent doc edits out of git (they're the live evidence of the standard you want), read the WIP Studio-Documentation.md, then fan out readers over the Feature docs against that charter.

- BASH: Show working tree and recent doc commits -> Diff Nathan's edits to three Feature docs -> Diff Nathan's edits to MarkdownPM and PommoraDND
- READ: [~/The Studio/References/Studio-Documentation.md]
- BASH: Check HistoryPM diff size, find References dir, size the Feature docs -> Locate the standards reference files
- READ: [~/The Studio/.claude/references/Studio-Documentation.md] -> [~/The Studio/.claude/references/Codemap-Format.md]
- DISPATCH: Explore — Inventory editor-cluster docs -> Explore — Inventory data-layer docs -> Explore — Inventory design/view docs -> Explore — Inventory content-model docs -> Explore — Inventory shell/surface docs
- BASH: List root docs and size Versioning + PRD
- READ: [.claude/VersioningPM.md] -> [.claude/PommoraPRD.md]

The PRD and Versioning are read and their Chapter 2 problems are already visible (Versioning ignores its own FORMAT from Studio-Documentation.md — wrong opening heading, a `### II. Upcoming` prefix, arc-bullets instead of per-version entries, British spellings; the PRD repeats "the shape both kinds inherited was removed rather than carried forward" twice in one section, carries checked-off Prospects residue, and neither doc has the §Guidelines footer its FORMAT calls for). Holding those for the scoping doc.

The five inventory agents are still reading the 26 Feature docs — synthesis starts when they report back.

[NATHAN]

I'd also want to scope out the removal of isolated sentences, and in-sentence colons unless absolutely necessary.

[CLAUDE]

Folding both in — they're the same disease as the rest. Two charter additions:

- **Isolated sentences** — a paragraph that is one sentence standing alone is fact-stacking's smallest unit; it either joins the paragraph it belongs to or wasn't worth recording.
- **In-sentence colons** — the "claim: elaboration" construction ("Robustness is render-inert rather than strip: an entry this build doesn't recognize…") gets restructured into natural sentences. Sanctioned colons stay: `**Label:**` bolded labels, `**SOURCE:**` tags, and table cells.

The agents are already out without these two rules, but both are pattern-detectable, so I'll quantify them myself and fold the counts into the per-file inventory rather than re-briefing:

- BASH: Count prose colons and isolated single-sentence paragraphs per Feature doc

The counts validate the exemplar cleanly — SymbolsPM, the doc you just hand-edited, sits at 1 prose colon and 0 isolated sentences, while the untouched docs run 15–20 colons each. The heavy offenders on both measures: ArchitecturePM (20 colons / 8 isolated), NexusRecordPM (19/5), MarkdownPM (19/3), ViewsPM (17/3), PropertiesPM (14/7), InteractionPM (15/4). These numbers ride into each file's inventory entry.

Still waiting on the five inventory agents — synthesis into the Planning doc starts when they land.

[NATHAN]

II. Is acceptable if it's a sub-scope; so something like Property Types would allow II. under the general properties description heading that describes the overall architecture. So it's conditional and where it makes sense

[CLAUDE]

Noted — the rule softens from "retired everywhere" to conditional: `II.` stays where the heading is a genuine enumerated sub-scope — a parent heading carries the general architecture and its `II.` children are ordered facets of it (PropertiesPM's general description heading over a `II. Property Types` section is the sanctioned shape). It goes where it's rote numbering that scopes nothing — a prefix on a section whose parent isn't describing anything the number subdivides.

The agents were briefed with the stricter version, so during synthesis I'll re-adjudicate every `II.` they flag against this conditional rule rather than folding their removals blindly — each one gets a keep/drop verdict in the per-file inventory instead of a blanket cut.

- RETURN: Returned the editor-cluster documentation inventory — per-file restructure verdicts and full heading maps for MarkdownPM, InteractionPM, and PommoraDND weighed against the new standard.

Editor cluster is back — PommoraDND graded worst per-line (§The Seam and §Relationship to dnd-kit are nearly all internal-API narration and migration history, with no Deferred section to receive its stranded pending-work), MarkdownPM carries the biggest absolute cut volume concentrated in §Non-Obvious, and three ownership seams (caret, drag chrome, autoscroll) are each stated twice across the cluster. Holding synthesis until the other four report.

- RETURN: Returned the data-layer documentation inventory — verdicts and findings for ArchitecturePM, PropertiesPM, and NexusRecordPM.

Data-layer cluster is in — PropertiesPM graded the cluster's worst (18 `II.` prefixes, two content-free bucket headings at title level, thirteen "colour" spellings against its own "color" usage, and a 500-word paragraph swallowing a UI spec), ArchitecturePM has no Pending/Known Issues section at all and hides one in a body blockquote, and the trash/restore story is told two-to-three times across the cluster with no single owner. Notably, both NexusRecordPM and ArchitecturePM contain near-verbatim instances of your canonical deletion example — the "one predicate answers, so two routes can't disagree" construction.

Three clusters still out.

- RETURN: Returned the content-model documentation inventory — StructurePM's heading map and restructure verdict, plus the rest of its cluster.

Content-model cluster is in, and it's the ownership map I needed: CollectionsPM emerges as the natural owner of the shared operational model (schema inheritance, move semantics, container CRUD) that Structure, PageSets, and Pages each restate with drift; ContextsPM owns the membership grammar; ArchitecturePM owns the kind-law and the absent content index that three docs currently mourn separately. StructurePM shrinks to what only it can say — the PARA mapping and pointers. The cluster also surfaced the `### Features` / `### Architecture` wrapper-heading pattern (content-free buckets that exist only to host `II.` subsections) as a structural question for the charter, which I'll adjudicate against your conditional-II. ruling per file.

Two clusters remain — design/view and shell/surface.

- RETURN: Returned the design/view cluster's documentation inventory across six files, calibrated against Nathan's own in-progress SymbolsPM edit as the exemplar.

Design/view cluster is in — SymbolsPM and TypographyPM sit at or near target (your SymbolsPM diff is doing exactly the work the charter names), while ViewsPM is the cluster's rewrite case: title heading at the wrong level, a contentless `### Features` wrapper, five `II.` prefixes, and the densest mechanism-narration paragraph in the set. TableViewPM's `### Non-Obvious` annex gets a dissolution verdict — nearly everything in it is the rule-2 class, with one product-visible fact re-homing to Groupings. Three facts are told in three docs each (the group-band "+" stub, the seam law, sort-retiring drag), each needing a single owner.

One cluster left — shell/surface — then synthesis.

- RETURN: Returned the shell/surface cluster's documentation inventory across seven files, including SidebarPM's heading map and restructure verdict.

All five clusters are in. Before synthesis, verifying two load-bearing claims firsthand — the heading-level pattern the agents flagged, and whether check-atlas.mjs survives the table-header capitalization the charter demands:

- BASH: Verify opening heading levels and wrapper/Non-Obvious patterns -> Check whether check-atlas keys on table header text
- WRITE: [.claude/Planning/Documentation Normalization.md]

The scoping is done — [Documentation Normalization.md](.claude/Planning/Documentation Normalization.md) holds the full standard, a per-file inventory of all 26 Feature docs, the cross-doc ownership map, Chapter 2's scope, and seven calls. Uncommitted, awaiting your review. The short version:

**The standard came from your own hands, not invention.** Your uncommitted edits to SymbolsPM, SurfacePM, MarkdownPM, and PommoraDND are a consistent ruleset: tables stand without preamble and absorb their trailing annotations as cells, lists run tight, mechanism narration and the insistent register ("deliberately," "load-bearing," "is what lets," "so the two can't disagree") get deleted rather than rewritten, and status text lives in the tail sections. The numbers validate it — SymbolsPM sits at 1 prose colon and 0 isolated sentences after your pass; untouched docs run 15–20 colons each.

**The inventory's shape:** 4 rewrites (PropertiesPM, ViewsPM, ContextsPM, PommoraDND), 15 restructures, 7 light-touch. The systemic findings: 8 docs open at `###` instead of `##`, 11 carry a content-free `### Features` wrapper, ~62 `II.` headings need keep/drop adjudication under your conditional rule, and both your canonical deletion example's siblings are everywhere — NexusRecordPM and ArchitecturePM each contain near-verbatim instances of the "one predicate answers, so two routes can't disagree" construction. The biggest structural win is the ownership map: schema/move semantics consolidate under CollectionsPM, the trash record under NexusRecordPM, view-generic rules under ViewsPM, and the footer/ghost-crumb facts under SubfieldPM — about sixteen facts currently told two or three times each get one owner and pointers.

**Chapter 2 is scoped, not started:** Versioning rewrites to its own Studio FORMAT (it currently ignores it — arc-bullets instead of per-version entries, a `### II. Upcoming` prefix, no §Guidelines footer), and the PRD gets the same charter plus truth-verification — its Collections section still claims "table / gallery" renderers, which predates Cards.

**The calls that need you** (full list in the doc): the canonical tail-section name (I propose Known Issues / Pending / Prospects, but you named "Deferred" — pick one); what happens to the two §Non-Obvious annexes' genuinely hard-won traps (I propose a Guidelines file for the real ones, deletion for the rest); sign-off on StructurePM's aggressive shrink to a PARA-map-and-pointers hub; and one conflict worth flagging — the inventory wants PagePreview's token section gone entirely, but your PM-093 routing said it "contains the description rather than verbatim," so my recommendation is your ruling stands and it just gets trimmed.

Execution order once ratified: mechanical sweep first (one commit per cluster, atlas checker green each time, everything pathspec-committed while the parallel session holds the tree), then the structural work orders, ToC blocks last since they depend on final headings, then Chapter 2.

[NATHAN]

give me an example of how you'd explain what connections are as its intro paragraph so I can make sure we're on the same page here.

[CLAUDE]

Here's how ConnectionsPM would open under the standard:

> Connections are Pommora's links between Pages. A `[[Title]]` written into a Page's body renders as colored inline text and navigates to the Page holding that title — the link lives in the prose itself rather than as a property or a chip, and the bracketed title is all that reaches the disk, so a connection reads the same in any Markdown editor. Titles resolve as pages render — a connection whose title matches one Page is live, one matching several is ambiguous, and one matching none sits as plain bracketed text until a matching Page exists. Renaming a Page rewrites every connection that references it, so links follow their targets.

What it's doing, deliberately: every sentence is a product behavior a user or agent can observe — what a connection is, where it lives, what it looks like on disk, how it resolves, what a rename does. What it's *not* doing is the current register's work — no "the sole connection syntax," no "never as Notion-style chips," no "resolution runs on an in-memory title map built from the page tree," no "the cascade IS the rename." The three states arrive woven into a sentence instead of announced as "a scanned title lands in one of three states:" with a hard count and a colon. The Obsidian claim survives as "reads the same in any Markdown editor" — the compatibility is stated as what it gives you, not as a brand comparison.

One judgment call embedded there worth confirming: I kept "ambiguous" and the resolution behavior in the intro because it's the feature's defining product semantics, not mechanism — the deeper detail (autocomplete, cascade atomicity, phantom styling) stays in the body sections. If you'd rather the intro stop at identity and disk-shape and let resolution be a body section's opening, that's the same standard with a tighter first paragraph.

[NATHAN]

I think you're overdoing the "so, "
Those aren't required, please execute this plan with a subagent pass to catch any weird or "why tf would anyone need to read that" stuff, but otherwise I'll confirm this is good.

[CLAUDE]

Confirmed — and the "so," habit goes into the charter as its own rule: state the behavior; a consequence clause has to earn its place, not arrive as a reflex. Executing now: I do the edits myself cluster by cluster (receivers before donors so no fact ever has zero owners mid-pass), atlas checker green per batch, everything pathspec-committed around the parallel session, then a fresh-eyes subagent pass hunts residue before I close.

- EDIT: [.claude/Planning/Documentation Normalization.md]

Softening the rule to match — it's a judgment test, not a ban:

- EDIT: [.claude/Planning/Documentation Normalization.md]
- BASH: Commit the ratified plan via pathspec -> Check recent commits and remaining working-tree state
- READ: [.claude/Features/ArchitecturePM.md] -> [.claude/Features/NexusRecordPM.md] -> [.claude/Features/PropertiesPM.md] -> [.claude/Features/StructurePM.md]
- WRITE: [.claude/Features/ArchitecturePM.md]

ArchitecturePM lands at ~166 lines from 198. Now NexusRecordPM:

- WRITE: [.claude/Features/NexusRecordPM.md] -> [.claude/Features/PropertiesPM.md]

Batch 1 written. Gating with the atlas checker, then committing:

- BASH: Run the token atlas checker -> Commit batch 1 via pathspec

Batch 1 committed at −58 net, checker green. Batch 2 — reading the design/view cluster:

- READ: [.claude/Features/DesignSystemPM.md] -> [.claude/Features/ViewsPM.md] -> [.claude/Features/TableViewPM.md] -> [.claude/Features/CardViewPM.md] -> [.claude/Features/TypographyPM.md] -> [.claude/Features/SymbolsPM.md]
- WRITE: [.claude/Features/DesignSystemPM.md] -> [.claude/Features/ViewsPM.md] -> [.claude/Features/TableViewPM.md] -> [.claude/Features/CardViewPM.md] -> [.claude/Features/TypographyPM.md] -> [.claude/Features/SymbolsPM.md]
- BASH: Gate with atlas checker, commit batch 2
- READ: [.claude/Features/ConfigurationPM.md] -> [.claude/Features/SubfieldPM.md] -> [.claude/Features/PagePreviewPM.md] -> [.claude/Features/NavigationPM.md] -> [.claude/Features/SidebarPM.md] -> [.claude/Features/SurfacePM.md] -> [.claude/Features/QuickCapturePM.md] -> [.claude/Features/MarkdownPM.md]

All of batch 3's material is loaded. Writing the seven shell-cluster rewrites:

- WRITE: [.claude/Features/ConfigurationPM.md] -> [.claude/Features/SubfieldPM.md] -> [.claude/Features/PagePreviewPM.md] -> [.claude/Features/NavigationPM.md] -> [.claude/Features/SidebarPM.md] -> [.claude/Features/QuickCapturePM.md]
- EDIT: [.claude/Features/SurfacePM.md]
- BASH: Gate and commit batch 3

Batch 3 committed at −41 net. Batch 4 — reading InteractionPM (MarkdownPM and PommoraDND are already in context):

- READ: [.claude/Features/InteractionPM.md]

All batch-4 material is loaded. Writing the Editor-Internals guideline (receiving the Non-Obvious traps), then the three rewrites:

- WRITE: [.claude/Guidelines/Editor-Internals.md] -> [.claude/Features/MarkdownPM.md] -> [.claude/Features/InteractionPM.md] -> [.claude/Features/PommoraDND.md]
- BASH: Gate and commit batch 4 -> Inspect current --card-min value and recent changes -> Locate --card-min-base declaration and check the other atlas rows -> Read card-tokens.css and check nav gallery's tokens -> True every Card Tokens row against the two sources -> Read the full token declarations in both files
- EDIT: [.claude/Features/CardViewPM.md] -> [.claude/Features/NavigationPM.md]
- BASH: Re-gate and commit batch 4 with truth fixes -> Find the autoscroll tokens' new home -> Verify token names and values in autoscroll.ts -> Confirm the remaining tunable names and values
- EDIT: [.claude/Features/InteractionPM.md]
- READ: [.claude/Features/InteractionPM.md]
- BASH: Gate then commit the autoscroll SOURCE fix
- READ: [.claude/Features/ContextsPM.md] -> [.claude/Features/CollectionsPM.md] -> [.claude/Features/PagesPM.md] -> [.claude/Features/PageSetsPM.md]

All five in hand — plus ConnectionsPM belongs to this batch. Reading it while writing the first rewrites:

- READ: [.claude/Features/ConnectionsPM.md]

Writing the six content-model rewrites:

- WRITE: [.claude/Features/StructurePM.md] -> [.claude/Features/ContextsPM.md] -> [.claude/Features/CollectionsPM.md] -> [.claude/Features/PagesPM.md] -> [.claude/Features/PageSetsPM.md] -> [.claude/Features/AgendaPM.md] -> [.claude/Features/ConnectionsPM.md]
- BASH: Gate and commit batch 5
- WRITE: [/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/d2aff109-72c2-4191-89cd-dc2721762020/scratchpad/toc.mjs]
- BASH: Insert ToC blocks into all Feature docs and inspect one -> Inspect PropertiesPM's nested ToC and gate -> Commit the ToC pass
- WRITE: [.claude/VersioningPM.md]
- EDIT: [.claude/PommoraPRD.md] -> [.claude/CLAUDE.md]
- BASH: Commit Chapter 2 plus the map row
- DISPATCH: Explore — Residue review, first half -> Explore — Residue review, second half

Both residue reviewers are out over the finished tree. Everything through Chapter 2 is committed — five cluster commits, the ToC pass, Versioning in its Studio FORMAT, the PRD trued (including the stale "table / gallery" renderer claim), and Editor-Internals.md on the CLAUDE.md map. When the reviewers report back I verify their findings firsthand, fold what's real, run the final gates, and deliver the closing report.

- RETURN: Returned the first half of the post-rewrite residue review — dead-weight passages flagged across the docs, led by the InteractionPM autoscroll-tuning clause.

First residue report is in — the big catches: DesignSystemPM lost its ToC (my script inserted it, but an outside save appears to have overwritten it), the `§charter` pointer dangles in five docs since the charter paragraph carries no heading, SurfacePM still points at the renamed `§II. Embeddings`, and NexusRecordPM references PropertiesPM's Remove cache with no antecedent. Several "residue" flags I'll adjudicate rather than fold blindly — a few hit things deliberately kept (the dnd-kit scope framing, philosophy copy). Verifying everything firsthand once the second reviewer lands.

- RETURN: Returned the second half of the residue review — justification and argument-chain clauses still embedded in the prose, led by PagesPM's derivation clauses.

Both reviewers are in. Now the verify-and-fold pass — first, quick firsthand checks on the claims that decide the fixes:

- BASH: Verify lavender cell, charter refs, lock key, and ContextPM queue items -> Survey recent code commits, working tree, and any new radius tokens -> Inspect PM-094's scope and new token declarations -> Confirm current token values before truing the tables
- WRITE: [/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/d2aff109-72c2-4191-89cd-dc2721762020/scratchpad/fold.py]
- BASH: Apply the fold + capture edits with per-edit verification -> Check the current state of the three failed targets -> Verify which DesignSystemPM edits landed -> Add the Pill Radius atlas row and gate

Checker green. Committing the fold-and-capture pass:

- BASH: Commit the residue fold and report totals -> Compute the pass's documentation diff

The pass is complete and committed — all 26 Feature docs, both root docs, a new guideline, and your mid-flight capture request, across nine commits (every one pathspec-scoped around the parallel session, atlas checker green at every gate).

**What shipped:**

- **Every Feature doc rewritten to the ratified standard**, cluster by cluster: data → design/view → shell → editor → content-model. The mechanism-narration class is gone (your canonical example and its ~40 siblings), the insistent register is gone, status text lives in Known Issues / Pending / Prospects, lists are tight, tables stand without preambles and wear Title-Case headers, and the ownership map landed — schema and move semantics consolidated into CollectionsPM, the trash record into NexusRecordPM, view-generic rules into ViewsPM, the caret into InteractionPM, footer facts into SubfieldPM, with pointers everywhere else.
- **The ToC experiment** — every doc opens on a codemap-format tree of its own headings, script-derived so none drift. DesignSystemPM's got overwritten once by an outside save and was re-added.
- **Editor-Internals.md** is a new Guidelines file holding MarkdownPM's hard-won traps (CRLF fences, UTF-16 offsets, `ignoreEvent`, the embed claim's single owner), on the CLAUDE.md map. The Non-Obvious annexes dissolved into it.
- **Chapter 2** — Versioning now follows its Studio FORMAT (per-version entries, §Guidelines footer, the retired IPC-map queue item dropped); the PRD trued (the stale "table / gallery" renderer claim, the Space-sidecar block-doc contradiction, the double-stated Agenda line, completed Prospects removed — your Ideas block untouched).
- **Your capture request** — PM-094's fallout is in the atlas: `--radius-full` gets its Geometry row, `separator.line`'s row died with the token, the card-token merge is recorded in CardViewPM with both SOURCE files, and the autoscroll table follows its tokens to `autoscroll.ts`. The parallel session had already captured the new States rows itself; I kept theirs.

**The residue pass:** two reviewers returned ~70 findings; I folded roughly two-thirds after verification — every dangling reference (the `§charter` pointer in five docs, `§II. Embeddings`, the index pointers now backed by a real ArchitecturePM Pending entry), the orphaned terms (`partial`, "preview origins", the Remove cache), and the surviving register. I deliberately **kept** what they over-flagged: the Design Philosophy copy, the dnd-kit scope framing, architecture-defining statements in the architecture doc, and the parallel session's fresh autoscroll preamble.

**Numbers:** Documentation-only — Net +94 | +1,176 / −1,082 across 30 files. The prose shrank ~250 lines while the ToC blocks added ~360; Actionable (code) diff is zero.

**Two calls left open for you:** the tail-section order isn't uniform across docs (each ToC agrees with its own body, so nothing's broken — say the word and I'll normalize to one order), and Versioning's `EXISTING IMPLEMENTATIONS` caps stayed because its Studio FORMAT prescribes them — flag it if you want the FORMAT itself softened. A History entry for this arc (PM-095, with PM-094 being the parallel session's) is drafted in my head and one word away from landing.

[NATHAN]

go ahead and finish out the open call with a yes, fix it while we're here.
Then write the History entry as one paragraph that it was just documentation normalization + recording what goes where in the docs.

Write the /session-handoff 
Next session picks up with context.md's options and a fresh list of focusses

[CLAUDE]

Three closers: the tail-order normalization, the PM-095 record, and the handoff. Starting with the state I need:

- BASH: Survey History, Handoff ownership, and Planning contents -> Reorder tail sections to Known Issues → Pending → Prospects

Now the record and Context. Reading both:

- READ: [.claude/ContextPM.md] -> [.claude/HistoryPM.md]
- BASH: Check --state-ghost's current value vs the atlas row

Ghost row already trued by the parallel session. Writing PM-095 and updating Context:

- BASH: Write PM-095, update Context, commit with the tail-order fixes -> Commit PM-095 and the tail-order fixes
- READ: [.claude/HandoffPM.md]

Rewriting the handoff's session half to current truth, preserving the transcript and guidelines:

- BASH: Rewrite the handoff's session sections

I dropped the Handoff Guidelines section in the splice — restoring it:

- BASH: Restore the Handoff Guidelines section

Now the transcript continuation — dispatching the transcription-agent:

- DISPATCH: transcription-agent — Continue handoff transcript

All three closers are in motion or done:

- **The tail order** is normalized — Known Issues → Pending → Prospects across PropertiesPM, SymbolsPM, and TableViewPM (the three deviants), ToCs matched, committed.
- **PM-095** is filed — index row plus the one-paragraph entry you asked for: the normalization itself and the ownership rulings of what lives where, with commits `8c291b83..20f3dfcd` and the documentation diff (Net +94 | +1,176 / −1,082, actionable zero). ContextPM's Current Focus now reads the arc as closed and points the next session at §Pending Focuses for its fresh pick, with Recent Work trimmed back to five entries under PM-095.
- **The handoff** is rewritten to current truth — this session's account, all completion criteria ticked, §Next Session pointing at a fresh read of Context's options, your five feedback quotes verbatim, and working notes on the two traps worth carrying (the checker's sub-8 numeric blind spot, and the pathspec discipline a live parallel session demands). The transcription-agent is appending the transcript now; when it lands I make the final commit (which also carries the CSS Duplication Report deletion sitting in the tree — not mine, riding along per convention) and hand you the receipt.

One capture note from the record-writing: the parallel session had already trued the `--state-ghost` row itself (`0.65`, part of PM-094's ramp), so the atlas is fully caught up on all four token changes.
`````

<!-- transcribe-anchor: b7318fd9-2ec3-469e-a620-30bb01b13137 -->
