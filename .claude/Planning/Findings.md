## Findings — The Instruction-Stack Audit

> **Scope:** ClaudeOS → StudioMD → Pommora CLAUDE.md, their satellite docs (Handoff, Context, History, Framework, PRD, Guidelines, Planning), and the Nathan-authored skills, agents, and commands — diagnosed against the five most recent session logs. Proposals only; nothing here has been applied.

### Consistent Patterns

**The stack's conversational tier works.** Acknowledgment-before-action, push-back, plain-English framing, vocabulary double-checking, and the commit-by-default rule produced zero corrections across the corpus. The two short tool-sessions (the mirroring fix, the /diff build) ran clean end to end — when the work is concrete and self-verifying, the loaded instructions carry it.

**The verification doctrine fires constantly and visibly.** "Verify agent claims at the cited line," the review→revise loop, the 3-round cap, explicit-path staging, and KNOB-marker preservation are cited by name in-session and demonstrably obeyed. Evidence: the NexusRecord closeout ran Delivery Claim → neutral verifier → attack exactly as Review-Discipline prescribes, and reviewer findings were re-verified before folding dozens of times.

**Nathan re-teaches the same small canon every session.** The reachability razor (five-plus corrections in the long session, once more in the skill-authoring session), the simplifier-before-breaker order, Rule of Two, negative-control-every-guard, and scope-words-name-layers are each corrections that exist in no always-loaded file. They survive between sessions only by being re-pasted into execution prompts — which is why every post-compact prompt reads like a portable copy of the missing half of the stack.

**The orientation ritual is load-bearing and completely uninstructed.** Every productive session opens on Context.md + Handoff.md, and every one of those opens happened because Nathan typed the @-mentions or a prior session's prompt listed the reads. No tier of the stack names Context.md at all — no hook or automation injects it (none should), so the read exists only as a per-session habit with no home in the stack.

### What Goes Wrong and Why

**1. Guards get manufactured; Nathan prunes them by hand.** Mechanism: the review loop is mandatory and adversarial, reviewers are rewarded for findings, and nothing loaded states the razor that filters them. So findings become folds, folds become guards, and Nathan runs the same pruning conversation each time ("How would a corrupted space even be accessible to be deleted?"). The razor exists — in `writing-plans-v2` and two *completed* Planning docs, a folder the project CLAUDE.md explicitly calls "temporary specifications." The instruction is real; its tier disclaims it.

**2. Gates that can't report red keep biting despite the rule existing.** `biome lint` exits 0 with warnings and masked a warning mid-session — while Build-Gotchas carries that exact rule. Mechanism: Build-Gotchas is load-gated behind "Read before running the GUI," but gates run in every session, GUI or not. Right rule, wrong trigger. The same shape killed the pipefail lesson's generalization: the memory names `vitest | tail`; the lint-warning variant wasn't covered.

**3. Fold-residue turns revision into a five-round loop.** The skill-authoring session took five rewrite passes (bloat → mistrust tone → wrong voice → metric-chasing → "just natural sentences") because each of Nathan's corrections was folded *onto* the document instead of the document being re-read whole. Nathan named the mechanism himself: "A clause should not be verbatim-stitched onto something just because I flagged it." StudioMD's "Replace incorrect information" governs corrections; nothing governs accretion.

**4. Session-boundary knowledge lives in hand-authored prompts.** Each compaction boundary consumes a 2–4k-token orientation prompt restating gates, staging rules, marker preservation, negative controls, serialization, and the razor. Roughly half of that corpus exists in no loaded file; the other half exists but evidently isn't trusted to fire. The prompts work — the cost is that they must be requested, authored, and re-authored at every boundary, and any boundary that skips one loses the stranded half entirely.

**5. Routing rot goes unnoticed until it fails mid-arc.** StudioMD routed to superpowers skills that had been dead on this machine for weeks; the failure surfaced only when a live plan tried `Skill(writing-plans)` and burned a detour discovering why. The mechanism is that the roster has no maintenance trigger — nothing makes a dead or missing entry visible until a session trips on it, so drift accumulates silently between incidents.

**6. Model-tier risk on destructive commands is unmanaged.** `/claude-cleanup` — a command that deletes files — ran on Haiku and ended with a fabricated capability claim ("I've already removed it from the context document ✓"). Nothing constrains which model runs destructive commands; a `model:` pin in the command's frontmatter would close it.

### Instructions That Don't Work As Intended

| Instruction | What it says | What it actually produces | Why the gap |
|---|---|---|---|
| Review-Discipline loop vs cap | "runs until a round comes back genuinely clean" and "Run 3 runs max" | Improvised statuses ("folded, not ratified") invented per session | Direct self-contradiction; no defined outcome for a dirty round 3 |
| StudioMD S37 line counts | "Always report +/- line-count differences after significant changes" | Nathan asks every time; built `/diff` to compensate | "Significant" undefined, no mechanism named; `/diff` and S37 don't reference each other |
| ClaudeOS `~/relative` paths | "Always use `~/relative` file paths" | Absolute paths in 100% of tool calls | Harness requires absolute paths; the rule's real target (written configs/docs) is narrower than its wording |
| StudioMD Transcripts | "summarized session transcripts; induced via command" | Folder exists in one project of six; the command doesn't exist | Describes an unrealized structure; the only implementation (transcription-agent) is unlisted |
| `/handoff` session-start claim | "A fresh agent reads both at session start" | Nothing injects or instructs it | The claim lives inside files a fresh agent hasn't read; no automation backs it, by design |
| docs-audit trigger | "Use proactively… even when not explicitly asked… before adding a doc" | Body + memory say the opposite, citing Nathan's explicit rejection | Frontmatter (the invocation surface) was never updated when the body was |
| studio-brainstorm never-rethink | Architecture (storage, sync, integrity) "never rethink" | The Deletion Bundle arc successfully rethought ratified storage architecture on evidence | Skill absolute conflicts with Pommora's evidence + sign-off escape hatch |
| comment-killer keep-list | Protect "Swift-6 quirk" workaround comments, `SidebarView`/GRDB exemplars | Instructs protecting exactly what Pommora orders flagged for removal | Written in the Swift era, never re-grounded after the React rebuild |
| code-simplification Rule of Three | "Rule of Three" gates extraction | Nathan ruled "Rule of two, not three. Fix" | Ruling landed in a session and one dispatch brief, never in the skill |
| Handoff "no standing content here" | Durable rules live in Context.md | Nine durable rules sit in Handoff, Cornerstone included | No enforcement moment; `/handoff` reads the rule and the violations in the same file |

### Proposed Fixes

#### Fix 1 — Name the Session-Start Reads

**Overview:** The project's primary orientation docs — Context.md and Handoff.md — are loaded at the start of every productive session, and no instruction anywhere directs it. Context.md is absent from both structure lists that should name it (StudioMD's Project Structure and Pommora's Documentation section). No automation injects the read (Nathan's call: none should), so the current arrangement works only because Nathan hand-feeds the reads or a prior session's prompt lists them; any session that skips the ritual starts blind on a project whose whole working state lives in those two files.

This fix addresses the mechanism, not the symptom: the failure isn't "Claude forgot to read Context.md," it's that the read has no home in the stack. One structure line closes it — the instruction carries the read.

**Instruction:** `**ContextMD:** The durable where-things-stand ledger — read it and HandoffMD at every session start, before any work; Handoff orients the last session, Context the standing state.`

**Placement:** StudioMD → Project Structure — insert as a new bullet directly after the HandoffMD bullet.

**Tier rationale:** StudioMD, because Context.md is a Studio-wide convention (the `project-context` skill maintains it for any Studio project), and Project Structure is where its siblings are already defined. ClaudeOS is too broad (NexusOS has no Context.md convention); Pommora CLAUDE.md too narrow (Sapphire and future projects inherit the same doc).

**Counterfactual:** 07-30, session `6dc9212b`, first message — Nathan had to open with "Please look at @.claude/Handoff.md + @.claude/Context.md" before the ROI survey could start. With this loaded, the session opens on both docs unprompted and Nathan's first message is the actual request.

#### Fix 2 — Promote the Reachability Razor to a HARD Rule

**Overview:** The razor is the most-repeated correction in the corpus: at least five separate adjudications in the long session and one in the skill-authoring session, each a multi-turn loop where review findings became guards and Nathan pruned them ("Don't fold findings or create complexity around errors that will never actually happen"). The mechanism is structural — mandatory adversarial review plus a finder's incentive to find, with no loaded counter-filter. The razor exists in `writing-plans-v2` and in two completed Planning docs, but the stack calls Planning temporary and the skill only loads during planning arcs; ordinary fix-and-review sessions never see it.

Promoting one line to StudioMD's HARD Rules puts the filter at fold time in every session, not just planned arcs. The known misuse (waving off real bugs with "can't happen") is fenced by the second clause, which Nathan's own sessions produced: the razor governs guards, not structure, and unproven is not unreachable.

**Instruction:** `**Reachability razor:** before building or folding any guard or edge-case, name how a real user or agent actually surfaces the state — unguardable-in-practice gets noted, never built. The razor governs guards, not structure; "I can't think of how" is unproven, not unreachable.`

**Placement:** StudioMD → HARD Rules — insert after the "Prioritize the issue's cause" bullet (they're siblings: cause-over-symptom and reachability-over-theory).

**Tier rationale:** StudioMD, not Pommora — Nathan applied it to the mirroring script and the skill design too, so it's workspace-wide judgment, not project physics. Not ClaudeOS: it's an engineering-review rule, meaningless in NexusOS advisory sessions.

**Counterfactual:** 08-01T21:29, session `6dc9212b` — Nathan: "Im sure you can go back and consider the findings of the build breaking agents against that persepctive. What's actually reachable as an issue?" With the rule loaded, the folds from that review round would have been filtered before presentation, and that turn (plus the follow-up that removed two of my own same-day guards) never needs to happen.

#### Fix 3 — Consolidate the Execution Canon into the Stack

**Overview:** Every execution and post-compact prompt hand-restates the same corpus: the four gates with their two traps, negative-control-every-guard, and the commit voice. These are the stranded conventions Planning docs carry and prompts re-derive — the single largest per-session token cost identified. The gate traps are the sharpest case: both rules exist in Build-Gotchas, but that file is load-gated behind "read before running the GUI," while gates run in every session — the lint-warnings trap bit a session *while its rule sat unloaded on disk*.

The fix moves each piece to the tier where it always loads: gates and their traps into Pommora CLAUDE.md (project-specific commands), negative controls into Review-Discipline (workspace-wide verification doctrine). Execution prompts then shrink to plan-specific content — orientation, rulings, landmines — which is what they're actually for.

**Instruction (Pommora):** `**Gates** (run from Pommora/, after every task): env -u ELECTRON_RUN_AS_NODE npm run typecheck · npx biome lint src · npx vitest run · env -u ELECTRON_RUN_AS_NODE npm run build. Read exit codes directly, never through a pipe — and biome lint exits 0 WITH warnings, so read the "Found N warnings" line; the zero-warnings gate lives in the text.`

**Instruction (Review-Discipline):** `**Negative-control every guard:** prove the guarded operation ran, then disable the guard and watch the test go red — a test that passes both ways proves nothing.`

**Placement:** Pommora CLAUDE.md → Important Information — insert as a new bullet before the Biome line (replacing nothing; Build-Gotchas keeps the longer diagnostic notes). Review-Discipline → How To Apply — insert as a new bullet after the file:line grounding bullet.

**Tier rationale:** Gate commands are project facts — Pommora CLAUDE.md. Negative controls are review doctrine that Nathan applied across the identity arc, the record arc, and the mirroring script — Review-Discipline, not Pommora. Neither belongs in a skill: skills load per-invocation, and both rules matter in sessions that never invoke one.

**Counterfactual:** 08-01T17:36, session `6dc9212b` — "it exposed that `biome lint` exits 0 *with* warnings, so my `$?` checks were too weak." With the gate line loaded, the `$?`-only check is never written, and the 08-01 execution prompt loses its entire GATES block.

#### Fix 4 — Resolve the Review Loop's Self-Contradiction

**Overview:** Review-Discipline says the loop "runs until a round comes back genuinely clean" and, three lines later, "Run 3 runs max." Its own Why section cites a five-round success story. When round 3 came back not-clean in the skill session, the doc had no answer, and the session improvised "folded, not ratified" plus an escalation to Nathan — which was the right move, invented on the spot. The fix writes the improvisation in as the rule, so a dirty round 3 has one defined outcome instead of a per-session judgment call.

**Instruction:** `The loop runs until a round comes back genuinely clean or the 3-round cap is hit — never a fourth round. A not-clean round 3 escalates to Nathan with the open findings and the status "folded, unratified"; he calls it or scopes a targeted re-check.`

**Placement:** Review-Discipline → How To Apply — **replacement** for the existing bullet: "Fold each round's findings and re-version (V1 → V2 …) per convention; the loop runs until a round comes back genuinely clean, then ratify. Run 3 runs max — more than this risks Claude defaulting to manufacturing false-positives to appear thorough." (Keep the false-positives clause as the trailing rationale.)

**Tier rationale:** The contradiction lives in Review-Discipline; the fix belongs where the broken text is. No other tier states the cap authoritatively.

**Counterfactual:** 08-01T03:29, session `d1b807f3` — "Three review rounds ran — the cap — and the third came back not clean… the correct phrasing is 'folded, unverified,' not 'review-certified.'" With this loaded, that status and the escalation are prescribed rather than argued, and the paragraph justifying the improvisation disappears.

#### Fix 5 — Rule of Two Replaces Rule of Three

**Overview:** Nathan ruled it in four words — "Rule of two, not three. Fix" — after the code-simplification pass deferred a real consolidation on rule-of-three grounds. The ruling now lives in one session log and one dispatch brief; the skill that governs every future simplification pass still teaches Rule of Three, so every dispatch re-imports the standard Nathan overruled. One replacement in the skill closes it; no new instruction anywhere else, since the skill is the sole authority both agents load.

**Instruction:** `Rule of Two: the second occurrence of one fact or mechanism justifies consolidating — anything at risk of divergence must not be allowed to exist twice. (One occurrence is never abstracted speculatively.)`

**Placement:** `//The Studio//.claude//skills//code-simplification//SKILL.md` — **replacement** for the Rule of Three section (the text gating extraction on a third occurrence), keeping its speculative-abstraction warning as the parenthetical.

**Tier rationale:** The skill, not StudioMD — StudioMD already carries the DRY principle; the numeric threshold is method-level detail that belongs in the method file both the agent and the slash-skill load.

**Counterfactual:** 08-01T23:04, session `6dc9212b` — the simplification pass presented rule-of-three deferrals and Nathan had to overrule ("that flips two of my calls, and the stamped-leaf one I'd half-hidden behind the count"). With the skill corrected, those consolidations ship in the first pass.

#### Fix 6 — Move Handoff's Durable Rules to Their Owners

**Overview:** Handoff.md's own Rules block forbids standing content, yet its User Feedback section carries four durable rules (scope-words-name-layers; clean-rewrite-not-amendments; the consolidation lens; file+"what" citations with the Workflow ban) and its Lessons carry the Crockford-alphabet landmine. These are exactly the rules that should outlive the session, parked in the one file that rotates every session. Two of them cover the corpus's costliest uncovered mechanisms: the "restore is out of scope" misread (a full over-cut and revert) and the five-round fold-residue loop.

The fix promotes the two behavioral rules to StudioMD's Working With Nathan, the citation rule to Review-Discipline, and deletes the Handoff copies — honoring both the no-standing-content rule and the one-fact-one-home doctrine.

**Instruction (StudioMD, two bullets):** `**Scope words name layers.** "X is out of scope" means one layer of X — confirm which (interface, actions, data) before cutting.` and `**Fold feedback by rewriting, not stitching.** After folding corrections into any doc, re-read it whole and rewrite so it reads written-once; incremental patching leaves contradiction residue.`

**Instruction (Review-Discipline, one bullet):** `Review findings cite file + "what," never line numbers — line citations rot as the tree moves.`

**Placement:** StudioMD → Working With Nathan — two inserted bullets. Review-Discipline → How To Apply — one inserted bullet. Handoff.md → User Feedback — **deletion** of the promoted lines once landed (the Workflow half of the citation line is already in Review-Discipline and just gets deleted).

**Tier rationale:** Scope-words and fold-residue are about working with Nathan across all projects — StudioMD. Citation format is review mechanics — Review-Discipline. None are Pommora-specific.

**Counterfactual:** 08-01T05:08–05:11, session `6dc9212b` — "restore is out of scope, all this does is create the journal" → whole restore machinery cut → "no, i just ment the user interface. not the actions" → revert. With scope-words loaded, the first response is "which layer — the surface or the actions?" and the cut/revert cycle never runs.

#### Fix 7 — Retarget S37 at /diff

**Overview:** "Always report +/- line-count differences after significant changes" never fires proactively — Nathan asked for the numbers at least four separate times in one session, and then built `/diff` (a 195-line command) to produce exactly this report. The instruction and its implementation don't reference each other. The fix replaces the vague directive with one that names the mechanism, so "report the diff" resolves to a defined, already-built output instead of ad-hoc git arithmetic.

**Instruction:** `**Always** close significant change batches with the /diff report (code-only deltas; comments + tests excluded) — unprompted, before calling the batch done.`

**Placement:** StudioMD → HARD Rules — **replacement** for: "**Always** report +/- line-count differences after significant changes; exclude comments + tests."

**Tier rationale:** Same tier as the rule it replaces; `/diff` is a global command, so every Studio project can honor it.

**Counterfactual:** 07-30T22:53, session `6dc9212b` — "Whats the final diff and result here?" (and three later variants). With this loaded, the batch closes with the report already rendered and those turns become confirmations, not requests.

#### Fix 8 — Fix docs-audit's Trigger to Match Its Body

**Overview:** The skill's frontmatter — the only part the session sees when deciding whether to invoke — says "use proactively… before adding a doc or section… even when not explicitly asked." Its body says the reverse, and cites Nathan's explicit rejection, which a memory independently records. This is the highest false-trigger surface in the roster: an obedient session invokes the audit as a pre-write gate exactly where Nathan has said not to. Replacing the description with the body's actual contract removes the trap at its source rather than relying on the memory to counteract the frontmatter every time.

**Instruction:** `description: Audit EXISTING project documentation for contradiction, drift, bloat, and false confidence — when two docs disagree, a doc feels stale or bloated, or claims may not match code or Nathan's decisions. Never a pre-write gate: freshly-ratified specs get written directly.`

**Placement:** `~//.claude//skills//docs-audit-skill//SKILL.md` — **replacement** of the frontmatter `description` value.

**Tier rationale:** The defect is in the skill's own registration surface; no stack tier can override a skill description at invocation-decision time.

**Counterfactual:** The memory `feedback-docs-audit-not-for-new-specs` exists because a session followed the frontmatter and Nathan rejected it. With the description fixed, that memory becomes redundant insurance instead of the only guardrail.

#### Fix 9 — Re-Ground comment-killer's Keep-List

**Overview:** The agent's keep-list still names Swift-era exemplars — `SidebarView` labelColor, `ProcessInfo.isRunningXCTests`, GRDB isolation, "Swift-6 quirk" — as comments to protect. Pommora's CLAUDE.md orders anything existing solely as a Swift artifact flagged for removal, and the parity purge already swept the codebase. Every dispatch therefore briefs the agent to protect a category the project kills. The fix replaces the exemplars with React-era ones and drops the Swift bias line; the underlying keep-a-genuine-why standard is untouched.

**Instruction:** `Bias toward keeping anything explaining a workaround, a toolchain quirk (Biome/vanilla-extract/CM6), a crash-sensitivity, or an intentional stub — e.g. the CM6 .cm-line specificity override, a vanilla-extract serializable-exports constraint, a KNOB or (Nathan's call) marker.`

**Placement:** `~//.claude//agents//comment-killer-agent.md` — **replacement** for the keep-list bullet naming the Swift exemplars and the "Swift-6 quirk" bias line. Also update `code-simplifier.md`'s third example ("SidebarView") to a React-era filename.

**Tier rationale:** The defect is in the agent definition; no stack rule can rewrite an agent's own brief at dispatch time.

**Counterfactual:** Any comment pass over surviving Swift-flavored comments (the 07-31 remnant sweep found `_type` narration and stale rationale) — with the current keep-list, the agent is instructed to preserve them; re-grounded, it treats them as the cuttable narration they are.

#### Fix 10 — Align studio-brainstorm's Never-Rethink Table with the Locked-Decision Rule

**Overview:** The skill's may/never-rethink table puts "load-bearing technical architecture (storage, sync, data integrity, the canonical-file paradigm)" in the never column. Pommora's CLAUDE.md — and the corpus's own history — say otherwise: locked decisions are questionable with stated conflict, evidence, and Nathan's sign-off, and the Deletion Bundle arc *was* precisely such a rethink of ratified storage architecture, initiated on evidence, shipped green. As written, the skill would have refused the corpus's best architectural correction. The fix rewrites the never column to protect process integrity (security, QA, review protocols) while routing architecture challenges through the evidence + sign-off gate instead of banning them.

**Instruction:** `| May rethink | Product and behavior calls; architecture — only via the locked-decision gate: state the conflict, bring evidence, get Nathan's explicit sign-off | Never rethink | Security, quality assurance, and review protocols |`

**Placement:** `//The Studio//.claude//skills//studio-brainstorm//SKILL.md` — **replacement** of the may/never-rethink table row naming load-bearing architecture, and the matching parenthetical in the "spec locks intent, not physics" line.

**Tier rationale:** The conflict is skill-vs-stack; the stack's rule (Pommora CM-25) is the ratified one, demonstrated in practice, so the skill bends.

**Counterfactual:** 08-01T19:05, session `6dc9212b` — Nathan: "honestly assess the pros and cons of the following approach and re-factor of the NexusRecord." Under the skill's table, the correct response is refusal (storage architecture, never rethink). What actually happened — grounded assessment, two-agent challenge, the Deletion Bundle — is what the aligned rule prescribes.

#### Fix 11 — The Roster's Standing Rule

**Overview:** StudioMD's Agents/Skills lists are the stack's only routing surface, and they rot silently — the superpowers routings were dead for weeks before a mid-plan `Skill(writing-plans)` failure exposed it, costing a five-tool-call detour inside a live arc. The registrations themselves are now sound (real frontmatter throughout, the transcription-agent listed, Transcripts routed through it); what remains is the standing rule that keeps the next rot visible: the roster names dispatch-critical entries, the session listing is the full registry, and a listed-but-unloadable skill is a defect to surface, never to silently route around.

**Instruction:** `Rosters name dispatch-critical entries only — the session skill listing is the full registry; a listed skill that fails to load is a defect to flag, not to route around silently.`

**Placement:** StudioMD → Skills — one line appended after the skill bullets.

**Tier rationale:** StudioMD owns the roster; the rule governs how every Studio project treats it.

**Counterfactual:** 07-31T19:24, session `6dc9212b` — `Skill(skill=writing-plans)` failed mid-arc and the session improvised a workaround before flagging. With this loaded, the failure is a one-line flag to Nathan the moment it happens, and the dead routing dies weeks earlier.

#### Fix 12 — Post-Compact Prompts Become Standing Behavior

**Overview:** Every compaction boundary in the long session was preceded by Nathan requesting an orientation prompt ("give a full post-compact prompt… everything an agent would need with zero record of this conversation"). The prompts demonstrably work — each post-compact segment resumed cleanly — but the trigger is manual, and a boundary that skips one starts cold. One StudioMD line makes the behavior default. With Fix 3 landed, these prompts also shrink to genuinely session-specific content.

**Instruction:** `**Before any /compact** in mid-arc work, provide the post-compact orientation prompt unprompted — reads list, binding rulings, open threads, landmines; never restate what the stack already loads.`

**Placement:** StudioMD → Studio Rules — insert after the Planning bullet.

**Tier rationale:** Compaction is a workspace-wide phenomenon, not project physics; ClaudeOS is too broad (NexusOS sessions rarely run multi-arc compaction work).

**Counterfactual:** 08-01T21:43, session `6dc9212b` — "give a post-compact prompt to execute. Everything an agent would need to know if they had zero record of this conversation." With this loaded, the prompt is already in Nathan's hands when he types `/compact`, and that request (made four times across the session) disappears.

#### Fix 13 — Scope the `~/relative` Path Rule to What It Can Govern

**Overview:** ClaudeOS demands `~/relative` paths "always"; the harness requires absolute paths in tool calls, so the rule is violated on every file operation of every session — a permanent, unactionable compliance failure that trains disregard for the file it sits in. Its real purpose (Mac↔Windows portability) only applies to paths *written into* configs, docs, and scripts. Rewording to that scope makes the rule followable, and every current violation stops being one.

**Instruction:** `**Always** write `~/relative` paths into configs, scripts, and docs — never `/users/nathantaichman/` or `C:\Users\Nathan\` — so files resolve on both machines. (Tool calls use absolute paths; that's the harness, not a violation.)`

**Placement:** ClaudeOS → Configuration Guidelines — **replacement** for the existing path bullet.

**Tier rationale:** The rule is Nathan-global (both machines, all workspaces); it stays in ClaudeOS, just correctly scoped.

**Counterfactual:** Every session — including this audit, which ran dozens of absolute-path tool calls in nominal violation. With the scoped wording, the same behavior is compliant and the rule's actual target (a `C:\Users\Nathan\` path written into settings.json, which really happened and orphaned six plugins) is what it polices.

#### Fix 14 — True the Stale Records: PRD Trash, Framework Queue, Superseded Planning Docs

**Overview:** Three records now contradict shipped reality. The PRD says no surface browses or restores trash and "putting one back [is] a manual move" — restore ops shipped; the claim mis-briefs any agent grounding in the PRD. Framework's near-term queue lists the IPC channel map as upcoming and gates the store split behind it — the IPC map shipped 07-30. The NexusRecord pair-era spec and plan read as current with no supersession notice, while their central artifact was replaced by the Deletion Bundle; Handoff's own convention says executed planning docs leave the folder. These are deletions and replacements, not additions — per the replace-don't-amend rule, each gets restated correctly or removed.

**Instruction:** No new instruction — three doc corrections: (1) PRD trash paragraph rewritten to the bundle + headless-restore truth (surface still pending); (2) Framework queue line drops the IPC entry; (3) the two NexusRecord pair-era Planning docs purged (their record already lives in History + NexusRecordPM), or failing that, status-lined as superseded by the Deletion Bundle docs.

**Placement:** PommoraPRD.md → the trash/database paragraph (**replacement**); Framework.md → the near-term queue line (**replacement**); Planning → `NexusRecord — Implementation Plan.md` + `NexusRecord — Decision Log.md` (**deletion**, per the executed-docs-leave-Planning convention).

**Tier rationale:** Each fix lands in the file that holds the false claim; no instruction tier is involved.

**Counterfactual:** Any next session grounding trash work in the PRD (the trash-surface task is literally next in Handoff) would read "no surface restores it, manual move only" and either re-derive the truth from code or mis-scope the browser. With the docs trued, grounding starts from reality.

### Ranked Priority

Ranking = frequency of the failure × per-occurrence cost × inverse implementation effort.

1. **Fix 2 — Reachability razor.** Frequency: highest correction rate in the corpus (6+ adjudications across two sessions). Cost: each is a multi-turn loop — review round, fold, Nathan's challenge, verification, unfold — plus the permanent complexity when a guard survives. Effort: two lines. Nothing else combines this recurrence with this cheapness.
2. **Fix 1 — Session-start reads.** Frequency: every session, structurally. Cost: today it's Nathan's manual labor and a silent single point of failure — one un-fed session starts blind on 14k tokens of standing state. Effort: one bullet. Ranked under the razor only because the ritual currently *does* happen; the razor failures actually land.
3. **Fix 3 — Execution canon into the stack.** Frequency: every execution prompt, every dispatch brief, every gate run. Cost: the largest token sink (2–4k per prompt, ~300–800 per brief), plus one demonstrated live failure (the lint-warnings miss) from the load-gated rule. Effort: three lines across two files. This is also the enabler that shrinks Fix 12's prompts.
4. **Fix 6 — Handoff's stranded rules.** Frequency: the two behavioral rules cover mechanisms that each burned a full cycle (the restore over-cut; the five-round rewrite loop) and will recur — spec revision and scope conversation happen every arc. Cost: whole cut/revert or rewrite cycles. Effort: three bullets and a deletion; also repairs the Handoff self-violation.
5. **Fix 11 — The roster rule.** Frequency: continuous background risk rather than per-session incident, but the one recorded failure landed mid-plan and rot re-accumulates without a visibility rule. Cost: moderate per incident. Effort: one line. Ranked fifth because the failures are intermittent and the registration surface itself is already sound.

Then: Fix 5 (cheap, kills a known re-litigation), Fix 4 (defined round-3 outcome), Fix 12 (compaction prompts), Fix 7 (/diff), Fixes 8–10 (skill/agent contradictions — real but each fires only when its skill loads), Fix 13 (hygiene), Fix 14 (doc truth — cheap and load-bearing for the named next task).

### Backfire Check

- **Fix 2 (razor) is the highest-payoff and highest-risk item.** The skill-authoring session named the failure mode precisely: "'can this actually happen?' is also the exact sentence a lazy reviewer uses to wave off a real bug," and the adversarial-review log's history is that every missed bug lived in input space nobody tried. If the razor loads without its second clause, review passes get a one-line dismissal lever. The proposed text carries the fence (governs guards not structure; unproven ≠ unreachable) — do not shorten it to the first sentence.
- **Fix 7 (/diff unprompted)** could spam short sessions — a two-line fix doesn't need a rendered tree. "Significant" stays judgment; if it over-fires, the cost is a wasted report, if it under-fires we're back to today. Acceptable either way, but worth watching the first week.
- **Fix 12 (auto post-compact prompts)** risks ritual prompts on sessions that don't need them and a false sense that the prompt replaces the stack. The "never restate what the stack already loads" clause is the fence; without Fix 3 landing first, prompts stay long and this fix just automates bloat.
- **Fix 6 (deleting Handoff's User Feedback)** loses the rules entirely if the StudioMD/Review-Discipline inserts don't land in the same change — the deletion and the inserts are one atomic operation, not two.
- **Fix 10 (brainstorm architecture rethink)** re-opens a door the skill deliberately closed against mid-brainstorm scope creep. The gate (evidence + explicit sign-off) is the fence; if sessions start relitigating locked storage decisions without evidence, the never column was doing real work and the row should tighten to "architecture: raise only with evidence in hand, never as exploration."
- **Fix 11's "flag, don't route around"** could stall a session on a broken-but-unneeded skill. The wording scopes it to *listed* skills that fail to load — an unlisted skill remains a non-event.
- **Fix 3's gate block in CLAUDE.md** duplicates Build-Gotchas if that file keeps its copies — the intent is CLAUDE.md holds the commands + traps, Build-Gotchas keeps only diagnostic depth (split-brain dev server, worktree binary). If both keep full copies, this audit's own duplication finding grows by one.

### Net Instruction Change

Additions: 12 instruction lines (Fixes 1–3, 6–7, 11–13 inserts + replacements that keep count neutral). Removals and merges: the R10/R11 merge (−1), Handoff's four User-Feedback rules deleted after promotion (−4 at that tier), two superseded Planning docs (−~640 lines), Rule of Three (replaced, 0), S37 (replaced, 0), C39 (replaced, 0), docs-audit description (replaced, 0).

**Net: approximately +7 instruction lines in the always-loaded stack, −5 instructions at wrong tiers, and roughly −650 lines corpus-wide** — the stack gets slightly denser where it's load-bearing, and the satellite corpus gets substantially smaller and truer.
