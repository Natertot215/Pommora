## Findings — The Instruction-Stack Audit

> **Scope:** ClaudeOS → StudioMD → Pommora CLAUDE.md, their satellite docs (HandoffPM, ContextPM, HistoryPM, VersioningPM, PRD, Guidelines, Planning), and the Nathan-authored skills, agents, and commands — diagnosed against the five most recent session logs. Proposals only; nothing here has been applied.

### Consistent Patterns

**The stack's conversational tier works.** Acknowledgment-before-action, push-back, plain-English framing, vocabulary double-checking, and the commit-by-default rule produced zero corrections across the corpus. The two short tool-sessions (the mirroring fix, the /diff build) ran clean end to end — when the work is concrete and self-verifying, the loaded instructions carry it.

**The verification doctrine fires constantly and visibly.** "Verify agent claims at the cited line," the review→revise loop, the 3-round cap, explicit-path staging, and KNOB-marker preservation are cited by name in-session and demonstrably obeyed. Evidence: the NexusRecord closeout ran Delivery Claim → neutral verifier → attack exactly as Review-Discipline prescribes, and reviewer findings were re-verified before folding dozens of times.

**Nathan re-teaches the same small canon every session.** The reachability razor (five-plus corrections in the long session, once more in the skill-authoring session), Rule of Two, negative-control-every-guard, and scope-words-name-layers are each corrections that exist in no always-loaded file. They survive between sessions only by being re-pasted into execution prompts — which is why every post-compact prompt reads like a portable copy of the missing half of the stack.

### What Goes Wrong and Why

**1. Guards get manufactured; Nathan prunes them by hand.** Mechanism: the review loop is mandatory and adversarial, reviewers are rewarded for findings, and nothing loaded states the razor that filters them. So findings become folds, folds become guards, and Nathan runs the same pruning conversation each time ("How would a corrupted space even be accessible to be deleted?"). The razor exists — in `writing-plans-v2` and two *completed* Planning docs, a folder the project CLAUDE.md explicitly calls "temporary specifications." The instruction is real; its tier disclaims it.

**2. Gates that can't report red keep biting despite the rule existing.** `biome lint` exits 0 with warnings and masked a warning mid-session — while Build-Gotchas carries that exact rule. Mechanism: Build-Gotchas is load-gated behind "Read before running the GUI," but gates run in every session, GUI or not. Right rule, wrong trigger. The same shape killed the pipefail lesson's generalization: the memory names `vitest | tail`; the lint-warning variant wasn't covered.

**3. Fold-residue turns revision into a five-round loop.** The skill-authoring session took five rewrite passes (bloat → mistrust tone → wrong voice → metric-chasing → "just natural sentences") because each of Nathan's corrections was folded *onto* the document instead of the document being re-read whole. Nathan named the mechanism himself: "A clause should not be verbatim-stitched onto something just because I flagged it." StudioMD's "Replace incorrect information" governs corrections; nothing governs accretion.

**4. Session-boundary knowledge lives in hand-authored prompts.** Each compaction boundary consumes a 2–4k-token orientation prompt restating gates, staging rules, marker preservation, negative controls, serialization, and the razor. Roughly half of that corpus exists in no loaded file; the other half exists but evidently isn't trusted to fire. The prompts work — the cost is that they must be requested, authored, and re-authored at every boundary, and any boundary that skips one loses the stranded half entirely.

**5. Routing rot goes unnoticed until it fails mid-arc.** StudioMD routed to superpowers skills that had been dead on this machine for weeks; the failure surfaced only when a live plan tried `Skill(writing-plans)` and burned a detour discovering why. The mechanism is that the roster has no maintenance trigger — nothing makes a dead or missing entry visible until a session trips on it, so drift accumulates silently between incidents.

**6. Model-tier risk on destructive commands is unmanaged.** `/claude-cleanup` — a command that deletes files — ran on Haiku and ended with a fabricated capability claim ("I've already removed it from the context document ✓"). Nothing constrains which model runs destructive commands; a `model:` pin in the command's frontmatter would close it.

### Instructions That Don't Work As Intended

| Instruction                        | What it says                                                           | What it actually produces                                                                | Why the gap                                                                             |
| ---------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Review-Discipline loop vs cap      | "runs until a round comes back genuinely clean" and "Run 3 runs max"   | Improvised statuses ("folded, not ratified") invented per session                        | Direct self-contradiction; no defined outcome for a dirty round 3                       |
| StudioMD S37 line counts           | "Always report +/- line-count differences after significant changes"   | Nathan asks every time; built `/diff` to compensate                                      | "Significant" undefined, no mechanism named; `/diff` and S37 don't reference each other |
| code-simplification Rule of Three  | "Rule of Three" gates extraction                                       | Nathan ruled "Rule of two, not three. Fix"                                               | Ruling landed in a session and one dispatch brief, never in the skill                   |

### Proposed Fixes

#### Fix 1 — Promote the Reachability Razor to a HARD Rule

**Overview:** The razor is the most-repeated correction in the corpus: at least five separate adjudications in the long session and one in the skill-authoring session, each a multi-turn loop where review findings became guards and Nathan pruned them ("Don't fold findings or create complexity around errors that will never actually happen"). The mechanism is structural — mandatory adversarial review plus a finder's incentive to find, with no loaded counter-filter. The razor exists in `writing-plans-v2` and in two completed Planning docs, but the stack calls Planning temporary and the skill only loads during planning arcs; ordinary fix-and-review sessions never see it.

Promoting one line to StudioMD's HARD Rules puts the filter at fold time in every session, not just planned arcs. The known misuse (waving off real bugs with "can't happen") is fenced by the second clause, which Nathan's own sessions produced: the razor governs guards, not structure, and unproven is not unreachable.

**Instruction:** `**Reachability razor:** before building or folding any guard or edge-case, name how a real user or agent actually surfaces the state — unguardable-in-practice gets noted, never built. The razor governs guards, not structure; "I can't think of how" is unproven, not unreachable.`

**Placement:** StudioMD → HARD Rules — insert after the "Prioritize the issue's cause" bullet (they're siblings: cause-over-symptom and reachability-over-theory).

**Tier rationale:** StudioMD, not Pommora — Nathan applied it to the mirroring script and the skill design too, so it's workspace-wide judgment, not project physics. Not ClaudeOS: it's an engineering-review rule, meaningless in NexusOS advisory sessions.

**Counterfactual:** 08-01T21:29, session `6dc9212b` — Nathan: "Im sure you can go back and consider the findings of the build breaking agents against that persepctive. What's actually reachable as an issue?" With the rule loaded, the folds from that review round would have been filtered before presentation, and that turn (plus the follow-up that removed two of my own same-day guards) never needs to happen.

#### Fix 2 — Consolidate the Execution Canon into the Stack

**Overview:** Every execution and post-compact prompt hand-restates the same corpus: the four gates with their two traps, negative-control-every-guard, and the commit voice. These are the stranded conventions Planning docs carry and prompts re-derive — the single largest per-session token cost identified. The gate traps are the sharpest case: both rules exist in Build-Gotchas, but that file is load-gated behind "read before running the GUI," while gates run in every session — the lint-warnings trap bit a session *while its rule sat unloaded on disk*.

The fix moves each piece to the tier where it always loads: gates and their traps into Pommora CLAUDE.md (project-specific commands), negative controls into Review-Discipline (workspace-wide verification doctrine). Execution prompts then shrink to plan-specific content — orientation, rulings, landmines — which is what they're actually for.

**Instruction (Pommora):** `**Gates** (run from Pommora/, after every task): env -u ELECTRON_RUN_AS_NODE npm run typecheck · npx biome lint src · npx vitest run · env -u ELECTRON_RUN_AS_NODE npm run build. Read exit codes directly, never through a pipe — and biome lint exits 0 WITH warnings, so read the "Found N warnings" line; the zero-warnings gate lives in the text.`

**Instruction (Review-Discipline):** `**Negative-control every guard:** prove the guarded operation ran, then disable the guard and watch the test go red — a test that passes both ways proves nothing.`

**Placement:** Pommora CLAUDE.md → Important Information — insert as a new bullet before the Biome line (replacing nothing; Build-Gotchas keeps the longer diagnostic notes). Review-Discipline → How To Apply — insert as a new bullet after the file:line grounding bullet.

**Tier rationale:** Gate commands are project facts — Pommora CLAUDE.md. Negative controls are review doctrine that Nathan applied across the identity arc, the record arc, and the mirroring script — Review-Discipline, not Pommora. Neither belongs in a skill: skills load per-invocation, and both rules matter in sessions that never invoke one.

**Counterfactual:** 08-01T17:36, session `6dc9212b` — "it exposed that `biome lint` exits 0 *with* warnings, so my `$?` checks were too weak." With the gate line loaded, the `$?`-only check is never written, and the 08-01 execution prompt loses its entire GATES block.

#### Fix 3 — Resolve the Review Loop's Self-Contradiction

**Overview:** Review-Discipline says the loop "runs until a round comes back genuinely clean" and, three lines later, "Run 3 runs max." Its own Why section cites a five-round success story. When round 3 came back not-clean in the skill session, the doc had no answer, and the session improvised "folded, not ratified" plus an escalation to Nathan — which was the right move, invented on the spot. The fix writes the improvisation in as the rule, so a dirty round 3 has one defined outcome instead of a per-session judgment call.

**Instruction:** `The loop runs until a round comes back genuinely clean or the 3-round cap is hit — never a fourth round. A not-clean round 3 escalates to Nathan with the open findings and the status "folded, unratified"; he calls it or scopes a targeted re-check.`

**Placement:** Review-Discipline → How To Apply — **replacement** for the existing bullet: "Fold each round's findings and re-version (V1 → V2 …) per convention; the loop runs until a round comes back genuinely clean, then ratify. Run 3 runs max — more than this risks Claude defaulting to manufacturing false-positives to appear thorough." (Keep the false-positives clause as the trailing rationale.)

**Tier rationale:** The contradiction lives in Review-Discipline; the fix belongs where the broken text is. No other tier states the cap authoritatively.

**Counterfactual:** 08-01T03:29, session `d1b807f3` — "Three review rounds ran — the cap — and the third came back not clean… the correct phrasing is 'folded, unverified,' not 'review-certified.'" With this loaded, that status and the escalation are prescribed rather than argued, and the paragraph justifying the improvisation disappears.

#### Fix 4 — Rule of Two Replaces Rule of Three

**Overview:** Nathan ruled it in four words — "Rule of two, not three. Fix" — after the code-simplification pass deferred a real consolidation on rule-of-three grounds. The ruling now lives in one session log and one dispatch brief; the skill that governs every future simplification pass still teaches Rule of Three, so every dispatch re-imports the standard Nathan overruled. One replacement in the skill closes it; no new instruction anywhere else, since the skill is the sole authority both agents load.

**Instruction:** `Rule of Two: the second occurrence of one fact or mechanism justifies consolidating — anything at risk of divergence must not be allowed to exist twice. (One occurrence is never abstracted speculatively.)`

**Placement:** `//The Studio//.claude//skills//code-simplification//SKILL.md` — **replacement** for the Rule of Three section (the text gating extraction on a third occurrence), keeping its speculative-abstraction warning as the parenthetical.

**Tier rationale:** The skill, not StudioMD — StudioMD already carries the DRY principle; the numeric threshold is method-level detail that belongs in the method file both the agent and the slash-skill load.

**Counterfactual:** 08-01T23:04, session `6dc9212b` — the simplification pass presented rule-of-three deferrals and Nathan had to overrule ("that flips two of my calls, and the stamped-leaf one I'd half-hidden behind the count"). With the skill corrected, those consolidations ship in the first pass.

#### Fix 5 — Retarget S37 at /diff

**Overview:** "Always report +/- line-count differences after significant changes" never fires proactively — Nathan asked for the numbers at least four separate times in one session, and then built `/diff` (a 195-line command) to produce exactly this report. The instruction and its implementation don't reference each other. The fix replaces the vague directive with one that names the mechanism, so "report the diff" resolves to a defined, already-built output instead of ad-hoc git arithmetic.

**Instruction:** `**Always** close significant change batches with the /diff report (code-only deltas; comments + tests excluded) — unprompted, before calling the batch done.`

**Placement:** StudioMD → HARD Rules — **replacement** for: "**Always** report +/- line-count differences after significant changes; exclude comments + tests."

**Tier rationale:** Same tier as the rule it replaces; `/diff` is a global command, so every Studio project can honor it.

**Counterfactual:** 07-30T22:53, session `6dc9212b` — "Whats the final diff and result here?" (and three later variants). With this loaded, the batch closes with the report already rendered and those turns become confirmations, not requests.

#### Fix 6 — Sweep the Last Swift Residue From the comment-killer

**Overview:** The keep-list itself is clean now; two Swift-era residues survive in the agent file. The caution paragraph still biases toward keeping "a Swift-6 quirk" — vocabulary that's dead in the React build and that Pommora orders flagged for removal — and the description's second dispatch example still narrates "recently-changed Swift files" and `SidebarView`, a SwiftUI-era filename that also anchors `code-simplifier.md`'s third example. Small, but each dispatch still carries them.

**Instruction:** `Bias toward keeping anything explaining a workaround, a toolchain quirk (Biome / vanilla-extract / CM6), a crash-sensitivity, or an intentional stub.`

**Placement:** `~//.claude//agents//comment-killer-agent.md` — **replacement** of "a Swift-6 quirk" in the caution paragraph with the toolchain-quirk phrasing, and a React-era filename in the description's second example. Same example swap in `code-simplifier.md`.

**Tier rationale:** The residue is in the agent definitions; no stack rule can rewrite an agent's own brief at dispatch time.

**Counterfactual:** Any comment pass over surviving Swift-flavored comments — with "Swift-6 quirk" in the brief, the agent is nudged to preserve exactly the narration the remnant sweeps exist to kill.

#### Fix 7 — The Roster's Standing Rule

**Overview:** StudioMD's Agents/Skills lists are the stack's only routing surface, and they rot silently — the superpowers routings were dead for weeks before a mid-plan `Skill(writing-plans)` failure exposed it, costing a five-tool-call detour inside a live arc. The registrations themselves are now sound (real frontmatter throughout, the transcription-agent listed, Sessions routed through it); what remains is the standing rule that keeps the next rot visible: the roster names dispatch-critical entries, the session listing is the full registry, and a listed-but-unloadable skill is a defect to surface, never to silently route around.

**Instruction:** `Rosters name dispatch-critical entries only — the session skill listing is the full registry; a listed skill that fails to load is a defect to flag, not to route around silently.`

**Placement:** StudioMD → Skills — one line appended after the skill bullets.

**Tier rationale:** StudioMD owns the roster; the rule governs how every Studio project treats it.

**Counterfactual:** 07-31T19:24, session `6dc9212b` — `Skill(skill=writing-plans)` failed mid-arc and the session improvised a workaround before flagging. With this loaded, the failure is a one-line flag to Nathan the moment it happens, and the dead routing dies weeks earlier.

#### Fix 8 — Post-Compact Prompts Become Standing Behavior

**Overview:** Every compaction boundary in the long session was preceded by Nathan requesting an orientation prompt ("give a full post-compact prompt… everything an agent would need with zero record of this conversation"). The prompts demonstrably work — each post-compact segment resumed cleanly — but the trigger is manual, and a boundary that skips one starts cold. One StudioMD line makes the behavior default. With Fix 2 landed, these prompts also shrink to genuinely session-specific content.

**Instruction:** `**Before any /compact** in mid-arc work, provide the post-compact orientation prompt unprompted — reads list, binding rulings, open threads, landmines; never restate what the stack already loads.`

**Placement:** StudioMD → Studio Rules — insert after the Planning bullet.

**Tier rationale:** Compaction is a workspace-wide phenomenon, not project physics; ClaudeOS is too broad (NexusOS sessions rarely run multi-arc compaction work).

**Counterfactual:** 08-01T21:43, session `6dc9212b` — "give a post-compact prompt to execute. Everything an agent would need to know if they had zero record of this conversation." With this loaded, the prompt is already in Nathan's hands when he types `/compact`, and that request (made four times across the session) disappears.

#### Fix 9 — True the Stale Records: PRD Trash, VersioningPM Queue, Superseded Planning Docs

**Overview:** Three records now contradict shipped reality. The PRD says no surface browses or restores trash and "putting one back [is] a manual move" — restore ops shipped; the claim mis-briefs any agent grounding in the PRD. VersioningPM's near-term queue lists the IPC channel map as upcoming and gates the store split behind it — the IPC map shipped 07-30. The NexusRecord pair-era spec and plan read as current with no supersession notice, while their central artifact was replaced by the Deletion Bundle; HandoffPM's own convention says executed planning docs leave the folder. These are deletions and replacements, not additions — per the replace-don't-amend rule, each gets restated correctly or removed.

**Instruction:** No new instruction — three doc corrections: (1) PRD trash paragraph rewritten to the bundle + headless-restore truth (surface still pending); (2) VersioningPM queue line drops the IPC entry; (3) the two NexusRecord pair-era Planning docs purged (their record already lives in HistoryPM + NexusRecordPM), or failing that, status-lined as superseded by the Deletion Bundle docs.

**Placement:** PommoraPRD.md → the trash/database paragraph (**replacement**); VersioningPM.md → the near-term queue line (**replacement**); Planning → `NexusRecord — Implementation Plan.md` + `NexusRecord — Decision Log.md` (**deletion**, per the executed-docs-leave-Planning convention).

**Tier rationale:** Each fix lands in the file that holds the false claim; no instruction tier is involved.

**Counterfactual:** Any next session grounding trash work in the PRD (the trash-surface task is literally next in HandoffPM) would read "no surface restores it, manual move only" and either re-derive the truth from code or mis-scope the browser. With the docs trued, grounding starts from reality.

### Ranked Priority

Ranking = frequency of the failure × per-occurrence cost × inverse implementation effort.

1. **Fix 1 — Reachability razor.** Frequency: highest correction rate in the corpus (6+ adjudications across two sessions). Cost: each is a multi-turn loop — review round, fold, Nathan's challenge, verification, unfold — plus the permanent complexity when a guard survives. Effort: two lines. Nothing else combines this recurrence with this cheapness.
2. **Fix 2 — Execution canon into the stack.** Frequency: every execution prompt, every dispatch brief, every gate run. Cost: the largest token sink (2–4k per prompt, ~300–800 per brief), plus one demonstrated live failure (the lint-warnings miss) from the load-gated rule. Effort: three lines across two files. This is also the enabler that shrinks Fix 8's prompts.
3. **Fix 4 — Rule of Two.** Frequency: every simplification dispatch re-imports the standard Nathan overruled. Cost: real consolidations deferred in the first pass, then re-litigated. Effort: one replacement in the skill both agents load — the cheapest fix on the list relative to how often the skill fires.
4. **Fix 7 — The roster rule.** Frequency: continuous background risk rather than per-session incident, but the one recorded failure landed mid-plan and rot re-accumulates without a visibility rule. Cost: moderate per incident. Effort: one line.
5. **Fix 3 — The review-cap resolution.** Frequency: every review loop that ends dirty at round 3 — a state each long arc has hit. Cost: an improvised status and a judgment call per occurrence. Effort: one replacement bullet.

Then: Fix 8 (compaction prompts), Fix 5 (/diff), Fix 6 (the comment-killer residue), Fix 9 (doc truth — cheap and load-bearing for the named next task).

### Backfire Check

- **Fix 1 (razor) is the highest-payoff and highest-risk item.** The skill-authoring session named the failure mode precisely: "'can this actually happen?' is also the exact sentence a lazy reviewer uses to wave off a real bug," and the adversarial-review log's history is that every missed bug lived in input space nobody tried. If the razor loads without its second clause, review passes get a one-line dismissal lever. The proposed text carries the fence (governs guards not structure; unproven ≠ unreachable) — do not shorten it to the first sentence.
- **Fix 5 (/diff unprompted)** could spam short sessions — a two-line fix doesn't need a rendered tree. "Significant" stays judgment; if it over-fires, the cost is a wasted report, if it under-fires we're back to today. Acceptable either way, but worth watching the first week.
- **Fix 8 (auto post-compact prompts)** risks ritual prompts on sessions that don't need them and a false sense that the prompt replaces the stack. The "never restate what the stack already loads" clause is the fence; without Fix 2 landing first, prompts stay long and this fix just automates bloat.
- **Fix 7's "flag, don't route around"** could stall a session on a broken-but-unneeded skill. The wording scopes it to *listed* skills that fail to load — an unlisted skill remains a non-event.
- **Fix 2's gate block in CLAUDE.md** duplicates Build-Gotchas if that file keeps its copies — the intent is CLAUDE.md holds the commands + traps, Build-Gotchas keeps only diagnostic depth (split-brain dev server, worktree binary). If both keep full copies, this audit's own duplication finding grows by one.

### Net Instruction Change

Additions: 5 instruction lines (Fixes 1–2, 7–8 inserts; Fixes 3–6 and 9 are replacements or deletions that keep count neutral). Removals and merges: the R10/R11 merge (−1), two superseded Planning docs (−~640 lines), Rule of Three / S37 (replaced, 0 each).

**Net: approximately +5 instruction lines in the always-loaded stack, −1 merged, and roughly −640 lines corpus-wide** — the stack gets slightly denser where it's load-bearing, and the satellite corpus gets substantially smaller and truer.
