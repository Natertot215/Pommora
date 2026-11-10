#### CONTEXT

List becomes Pommora's third view kind with a renderer. The brainstorm is finished: Nathan ratified *List View — Decisions & Intention* on 11-09-2026 with 51 decisions, a zero-context agent's questions were answered or handed to planning by number, and the Investigation's cited code was re-read first-hand at `4b18149ac`. No code has changed and nothing is committed; `.claude/Planning/List View/` is untracked.

This session plans the work and reviews the plan, unattended and end to end. It doesn't implement.

- **SOURCE:** `.claude/Planning/List View/` — *Decisions & Intention* (ratified; it holds wherever another document disagrees), *Brief* (Nathan's words, verbatim), *Investigation*, *Scout Findings*, *Fresh-Eyes Read*
- **SOURCE:** `~/NexusOS/Studio/Athena/II. Drafts/Plan-Creation.md` — the planning process and the plan document's format; the installed `writing-plans` skill fills its blank sections
- **SOURCE:** `.claude/Planning/Completed/MetadataV3/MetadataV3 — Implementation Plan.md` — the reference plan: *§Constraints*, *§Process Overview*, the review checkpoints, *§Final Verification*, and the Net Ledger
- **SOURCE:** `.claude/Planning/Completed/Metadata Picker/Metadata Picker — Plan Reviews.md` — the record the plan's review waves follow
- **SOURCE:** `.claude/Features/ViewTypesPM.md`, `.claude/Features/PommoraDND.md`, and `.claude/Guidelines/Development-Environment.md`, which is required before driving the app
- **SOURCE:** `~/The Studio/.claude/references/studio-documentation.md`, and `.claude/Features/CollectionsPM.md` › *§The Archive*, which Nathan wrote

#### MANDATE

Produce *List View — Implementation Plan* in `.claude/Planning/List View/`, written to Plan-Creation's format, reviewed through every wave below, and left at **STATUS: Draft** for Nathan's ratification. Nathan isn't reachable while you work. Don't stop to ask: weigh each call against his Approach and Principles, take the best one, record it, and report it at the end where he'd reasonably want a say.

#### NATHAN'S DIRECTIVES

These are Nathan's words, verbatim. Every handoff this work ever produces, for compaction, execution, or review, repeats this whole section in full; a summary isn't a substitute. They also live in *List View — Brief*.

For this session the 11-09-2026 directive governs wherever an earlier one says to stop for Nathan: Planning rule 3's "stop and ask" and the placement constraint's "come to me first" both become decide, record, and report. Never call a tool that waits on him, `AskUserQuestion` included.

**For This Session (11-09-2026):**

> I want you to write a handoff prompt that captures my directives and allows you to best complete headless and unatended end-to-end planning and reviews. Each phase and task's are investigated by the code yourself, and written yourself; agent's do reviews, syntehsis and cross-source elimination. Just like both views existing files, comments stay very, very brief and minimal; mostly file-level format sectioning. Documentation changes should be surgical, the Archive section of Collections was written by me, so that's good reference. Describe the feature in enough detail without over-detailing the code or things that dont actually matter, net-negative edits to adjacent claims are encouraged. Weigh in-flight decisions against approach and principles, make the best choice, and make the choice known In-chat if you'd think its something I'd reasonable want to change -- don't obsess over things I couldnt care less about. When the session of planning and review is done, give me the full plan summary + the same "outside-perspective" yet detailed overview of what gets built. If anything genunelly needs my decision, make it known, and also ensure its alternatives have been properly scoped so you know if its even worth mentioning at all. Use the multi-wave review process. Every future handoff must carry my directives. Use the send notification tool at key moments.

**Constraints:**

- Any planning must include removal-first emphasis. We’re tackling cross-feature work that likely has room to result in “less” within other areas. Nothing is added unless it’s determined its own absence would leave a real gap.
- Nathan's <approach> and <principles> govern every phase and task, and every agent brief on this topic — scouts, executors, and reviewers — carries both sections in full.
- And any and all placements of these files would need to come to me first so I approve of where they go within the codebase.
- Nothing here should be designed in isolation where it should actually adhere to the shared-first design priorities of the remaining view structure.
- Documentation changes should be surgical and follow `c/studio-documentation`. ListView is the least unique of the view types, so its own doc and mention within others should be feature-overview-level and quite brief in comparison.

**Approach:**

- Any approaches being considered here must first assess what’s true *now* that would be able to be removed, deleted, changed, consolidated, or replaced. We’re not going to design based on what’s currently there and simply adjust course, we’re ensuring totality-first application, removal-first scoping, and residue-eliminating frameworks that provide a clean slate rather than building changes on top of what’s ultimately going to be replaced.
- We’re approaching this through consolidation-first properties, ensuring the codebase ends up more understandable, less complex, more efficient in what it does, less conflicting in defining that, and an overall cleaner foundation to work within.
- We shouldn’t adding anything new unless there’s evidence that it’s required. We’d approach this through the perspective of ending up with cumulatively “less stuff” in the codebase overall — less ways to do similar things, less complexity, fewer paths to go through, less tech debt waiting to surface, less things to maintain, and fewer headaches when approaching future work entirely — while the line-count *may* end up positive. Net-negative lines are the north star, but any net-positive gain *must* have its rationale for that outcome be genuinely backed through this framework and our <principles>.
- Anything within our surface area should be left reading as always-intentional, without any odd-ones-out designs, and be reflective across the broader codebases' resulting shape — not just maintaining remnants or adherence to what’s true *now* that’s ultimately going to change. The approach should reflect the outcome and shouldn’t be bound to constraints that were only relevant before.
- Ensure we're looking *outward* for cross-file opportunities and shared design, avoiding hand-rolling or duplicating what's already there or can be adjusted accordingly. Pommora is an established codebase and we’re not starting from scratch.
- The complex data-level mechanics of the codebase are what least reflect *Nathan’s* intentions and are primarily reflective of what’s determined appropriate via past session agents. Treat it with care and respect, but don’t assume it’s beyond changing within reason, where simply presenting the approach to Nathan may be all that’s required to genuinely change the codebase for the betterment of everything within it and future iterations.

**Principles:**

- **Less to Carry:** No more functions, helpers, wrappers, types, layers, and call sites than necessary, and no logic stated twice. New code earns its place by removing more than it adds, fixing incorrect behavior, or delivering required behavior in its minimal form.
- **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before, whether a developer reading code or Nathan reading file names and headers. A blind-eye review of the surface areas impacted by this implementation should find less confusion, less conflict about intent, and an unambiguously more approachable, maintainable ecosystem to iterate on.
- **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go, with no choice between layers, helpers, or modules — nothing that exists somewhere where it shouldn't; nothing implemented where something else already does it or adjusting it accordingly would be the more appropriate approach; nothing that increases the risk of misassumption when working here in the future.
- **Reads as Designed:** Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains. Nothing designed around codebase shapes that will ultimately be changed for the better.
- **One Way:** Each thing has one implementation, one pattern, and one source of truth. No part contradicts another. Exceptions carry their reason where a reader meets them, in code or feature documentation.
- **Real Purpose:** Anything added to the codebase should have its purpose clearly stated from the perspective of its value in enhancing what's already there — complexity, duplications, divergences, multiple ways to do the same thing — and anything "new" added should be assessed using that. Line-count increases shouldn't translate into maintenance cost or complexity.
- Anything introduced should have independent justification behind its existence that isn't simply self-induced requirements.
- Anything changed or implemented should be reflected across the board — nothing that's done this way here, while something else works differently elsewhere, unless that's *genuinely* correct.
- Zero data-level spaghetti, complexity, or additional 'stuff' should be added without reason. Rewiring things to become more understandable, more efficient, more appropriate, and more effective is preferred when the alternative is just adding more to something that's inherently unfit to suit the long-term mandate of what's actually being offered.

**Planning:**

1. **Look Outward First:** before designing any piece, name every function, field, file, or rule it would add, and scout what already exists for each.
2. **Verify Nathan's Claims:** check every architectural claim he makes against the tree and report what contradicts it, plainly; he wants it. Many previous plans had corrections that were flagged against what went unnoticed during the brainstorming process, and each correction changed the design.
3. **Ask, With a Read Attached:** where an answer reads more than one way, stop and ask, with what was found, what it implies, and the call put up for correction; Nathan isn't technical, so each question is explained in plain terms.
4. **Disclose In-Flight Calls:** a judgment made during planning or execution is stated in chat when it's made, and recorded where it changes an outcome.
5. **Write With Intent:** decisions and plans state intended behavior as intent ("should"), separate from statements of how the code works today, so a future reader never takes a decision for a fact or a fact for a decision.
6. **Explain:** Don't assume Nathan reads the docs you’re writing, let him know what needs to be known and explain things in chat directly; don’t leave things ambiguous or unresolvable from discussion alone.

**Standing, From the Brief:**

> Use the NexusOS/Studio/Athena/II. Draft versions of Plan-Creation and Studio-Brainstorm-V2 for the process that should act as the replacement for the existing writing-plans and studio-brainstorm skills. These are the work-in-progress updates; fall back to the current skills where there are any gaps, but assume the drafted versions are the ones you should prioritize.
>
> Use the recently completed planning documents to inherit the Constraints — the principles the plan must adhere to and the requirements for having any agent dispatch follow and inherit them — as well as the two-wave + neutral perspective review process for *both* the pre-implementation planning phase and the post-implementation final integration reviews. MetadataV3 is a very good reference.
>
> If planning doesn’t really need much from me, or there really isn’t much for me to decide on, that should be an acceptable option. Consider that rework in this area has already happened before, so there’s likely intention behind anything you’d flag as “unintentional” — that doesn’t mean it’s beyond changing when it makes sense.
>
> Keep responses brief and to-the-point. Use proper formatting and don’t bury me in information. Present what I actually want to know.

#### WHO DOES WHAT

- **You investigate and you write.** Open the code behind every phase and every task yourself before writing it, and write every phase, task, and AFTER block yourself. No scout or drafting agents.
- **Agents review, synthesize, and eliminate across sources:** the review waves, a synthesis of several reviewers' findings into one deduplicated list, and cross-checks of one document against another. Verify each finding against the tree yourself before it folds.
- Every agent brief carries the Approach and the Principles in full, names its model and effort, and follows the `agent-orchestration` skill: ask for a review of what's there, not confirmation of what you expect.

#### Task 1 — Orient

1. Read every SOURCE, *Decisions & Intention* first and whole. Record the baseline: `git rev-parse --short HEAD`, and the three gates' results from the repo root (`npm run typecheck`, `npm run test`, `npm run lint`).
2. Re-verify against HEAD every Investigation claim a task will lean on; the Investigation was written against the first twelve decisions and its approaches section predates the rest.
3. Settle what the Decisions doc leaves to planning, each from the code and against the Approach and Principles, recording the call and its reason: its *§Open Items*, and *Fresh-Eyes Read* questions 6, 7, 9, 12, 13, 14, 16, 17, 21, 25, 30, and 34.

#### Task 2 — The Live Checks

1. **First, E-7's premise:** show that two displacement lists trade rows inside a settings pane, with a hidden foot that doesn't drag and Title held to the Left column. Build it as a throwaway in the Iteration Scratchpad (`Core/Interface/Windows/IterationWindow.tsx`, ⌘⇧T), drive it over CDP against `~/Test`, and remove every trace when it has answered.
2. If it fails, scope the alternatives with real costs before deciding anything: a drop line with a left-right lane pick and its keyboard path in the drag kit, and a stacked Left-over-Right pane. Take the best under the Approach and Principles, write the plan on it, and put it to Nathan in the final report with the others' costs beside it.
3. Run the checks in *Investigation §What Can't Be Known Without Running the App* that a task leans on, the Text pen's hover width in a value sized to its text among them.
4. Leave no fixture, process, or change to `~/Test` behind. Before Task 3 opens, `git status --short` shows only `.claude/Planning/List View/` and no dev server is running.

#### Task 3 — Write the Plan

1. Follow Plan-Creation's document format: Context, Overview, Concepts (written last), Constraints, Process Overview, phases and tasks with AFTER blocks as close to the final code as you can write them, Completion Criteria, Final Verification, Reconciliation, Open Items, Deviations.
2. **Removal first in every phase.** Order the phases so shared pieces are lifted before List composes them: the row frame out of `TableView.tsx`, the one clickable value, Cards' add-show-hide rules, the one **+**, and the hidden-position fix land before the renderer.
3. **Constraints** carry Nathan's Directives verbatim, the gates, what's frozen, the comment rule, the placement rule, the execution rule (each task to an `execution-agent`, each review checkpoint to a simplification read and an adversarial read), and a Neutral Gate: one plain paragraph of what the work intended, for a `fable-high` reviewer given only the baseline, HEAD, and that paragraph. *§Final Verification* names its lenses and models as MetadataV3's does: a simplification lens (`opus-xhigh`), then an adversarial lens read inward and outward (two `opus-xhigh`), then the neutral reviewer (`fable-high`).
4. **Comments:** AFTER blocks leave fewer comments than the code holds. A new file carries section dividers in the form Table's and Cards' files use (`// ── The render ──`) and almost nothing else.
5. **Placement:** *Decisions & Intention §J* is what Nathan approved. Any other new file is named in the final report for his approval, with where you'd put it and why.
6. **Out of the plan (I-7):** folding Archive's and Trash's rows into the row frame and Table's cells into the clickable value. *§Reconciliation* raises each as an `IssuesPM.md` entry once List's design is confirmed in the app.
7. **Behavior changes outside List** are named as such, not folded in: a hidden property keeping its place through a reorder in Table and Cards (which inverts `columns.test.ts`'s pinned case), a Link's Format on right-click in every view, the band's **+** moving onto `AccessoryButton`, and the grip anchoring to a row's first line.
8. **The Number:** estimate each phase's additions and removals apart, as `view-delta` measures them, and state what any net gain buys against the Principles.
9. **Tests and the drive:** each changed test asserts the behavior a decision names; the Views Drive gains List's own cases and the regressions it shares with Table.

#### Task 4 — The Documentation Phase

1. Write it as the plan's last phase, to `studio-documentation.md`, with *CollectionsPM §The Archive* as the register: what the feature is and how it behaves, from the product's side, in a few paragraphs.
2. `ViewTypesPM.md` gains a brief List section, and each sentence the work makes false is replaced surgically; the Investigation lists them for `ViewTypesPM.md`, `PommoraPRD.md`, and `FrameworkPM.md`.
3. Cut adjacent claims that are stale, duplicated, or over-detailed where you meet them. A documentation phase that ends net-negative is the goal.

#### Task 5 — The Review Waves

No wave starts until the plan is whole. Reviewers are read-only and may build tasks in a scratch export. A simplification reviewer first reads `~/The Studio/.claude/skills/code-simplification/SKILL.md`, and an adversarial reviewer `~/The Studio/.claude/skills/adversarial-review/SKILL.md`. Record every wave in *List View — Plan Reviews* as *Metadata Picker — Plan Reviews* does: findings by severity, what folded and into which task, what wasn't taken and why.

1. **Wave One · Outward (`opus-xhigh`):** a simplification read and an adversarial read, in parallel, each weighing the plan against the rest of Core, Desktop, and UIX: what it duplicates, what it leaves as an odd one out, what it could remove and doesn't.
2. **Wave Two · Inward (`opus-xhigh`):** an executor read, taking each task as the agent who'd carry it out and reporting what it couldn't execute as written, and a second simplification read of the plan as revised.
3. **Wave Three · Both Ways (`fable-high`):** one neutral read that traces every fold from the first two waves into the code it lands on and answers whether a before-and-after reader would prefer the after.
4. Where two reviewers overlap or disagree, a synthesis agent may reduce their findings to one list; you verify each against the tree before folding. If Wave Three's verdict isn't to ratify, fold and run it once more; if the second still isn't, report what it holds against the plan as unresolved.
5. Afterward, bring *Investigation* and *Scout Findings* into agreement with the plan, replacing what's wrong in place.

#### Task 6 — Report

End with one message to Nathan, formatted and plain, since he isn't technical and won't read the documents:

1. **The plan in full summary:** its phases in order, what each removes and adds, the estimated number, and how it gets executed and verified.
2. **What gets built, from the outside:** the same detailed overview he was given before planning — what List is, the settings, how it's built, what changes outside List, what's out, what's unproven — updated to what the plan says.
3. **Decisions that are his:** only those that genuinely need him, each with its alternatives scoped and costed so the choice is real. If none, say so.
4. **Calls you made** that he'd reasonably want to change, in a line each. Leave out what he couldn't care less about.
5. **Review record:** each wave's findings count and verdict, and anything not taken.

#### NOTIFICATIONS

Use the notification tool (`PushNotification`, a deferred tool loaded through `ToolSearch`; the work continues without it if it isn't available) at: the E-7 live check's result; the plan complete and entering review; each wave's close; a failure that stops the work; and the final report ready.

#### GUIDELINES

- Change no production code. The only code you write is the live checks' throwaway, removed before Task 3. Commit nothing unless Nathan says to.
- A ratified decision changes only on Nathan's word. Where the code makes one worse than it sounded, plan on the nearest faithful reading and raise it in the report.
- Don't relitigate the Decisions doc's *§Rejections*.
- Weigh a call by whether Nathan would notice or care: design, behavior, names he reads, and placements are his; mechanism is yours.
- Keep the work on disk as it's made: write each phase into the plan file when it's finished, and keep *List View — Planning Ledger* beside it, a short running record of which task is done, every call made with its reason, and what the final report owes Nathan.
- Don't stop for context. After any compaction, reread NATHAN'S DIRECTIVES, the ledger, and the plan's *§Constraints* from the files, then continue. Remove the ledger once the report is delivered.
