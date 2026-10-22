### Properties Restructure — Brief

**DATE:** 10-21-2026
**STATUS:** RATIFIED 10-21-2026

The standing approach, principles, perspectives, constraints, and process for the Properties Restructure — a self-contained, full-sweep inventory, assessment, and deep clean of Pommora's Properties system. Every planning document, agent dispatch, session handoff, and continuation procedure copies *§Constraints* one-for-one, in the wording below. The project and global `CLAUDE.md` files still hold the conventions that apply everywhere; where a ratified decision is more specific than a principle here, the decision wins.

#### The Documents

- ***Properties Restructure — Decisions & Intention***: the intent, authoritative once ratified, with each decision tagged CONFIRMED, INFERRED, or ASSUMED and the session's questions and answers closing it.
- ***Properties Restructure — Planning Findings***: the technical evidence behind the plan and the Morning Report's calls: every planner's call settled, the edge rules that stay, the measurement rules, the ledger, and the Sync rebuild inputs.
- ***Properties Restructure — Implementation Plan***: the phases and tasks, written as diff blocks `.claude/scripts/plan-replay/plan_replay.py` applies.
- ***Properties Restructure — Morning Report***: what the plan is, the calls left to Nathan, where planning closed, and the plain-English walkthrough of everything the work changes against what's true now, which every overview in planning follows.
- ***BRIEF.md***: this document.

---

#### Constraints

These sections are copied verbatim into every planning document, agent dispatch, session handoff, and continuation procedure for this work.

##### Who Carries These

- Nathan's approach, principles, perspectives, and constraints below are the core philosophy of the planning session and of every agent sent in planning and execution: scouts, executors, and reviewers each carry all four sections in full, word for word, in their briefs.
- The neutral verifier alone receives none of them. It's given only the baseline commit, HEAD, and a plain statement of what the work intended, and its unprimed read is the input against which the work's adherence to them is judged.

##### Approach

Nathan's, verbatim, with the overlapping entries of his two lists folded together as he ratified on 10-21-2026; Nathan's approach, principles, and perspectives govern every phase and task, and every agent brief on this topic — scouts, executors, and reviewers — carries all three sections in full.

- **Removal First:** any approach first assesses what's true *now* that could be removed, deleted, changed, consolidated, or replaced. The design isn't based on what's currently there with its course adjusted; it ensures totality-first application, removal-first scoping, and residue-eliminating frameworks that provide a clean slate rather than building changes on top of what's ultimately going to be replaced.
- **Consolidation First:** the codebase ends up more understandable, less complex, more efficient in what it does, less conflicting in defining that, and an overall cleaner foundation to work within.
- **Less Stuff:** nothing new is added unless there's evidence it's required, and nothing carries more functions, helpers, wrappers, types, layers, and call sites than necessary, with no logic stated twice. New code earns its place by removing more than it adds, fixing incorrect behavior, or delivering required behavior in its minimal form. The work ends with cumulatively less in the codebase overall — fewer ways to do similar things, less complexity, fewer paths to go through, less tech debt waiting to surface, fewer things to maintain, and fewer headaches in future work — while the line count *may* end up positive. Net-negative lines are the north star, and any net-positive gain has its rationale genuinely backed by this framework and the principles here.
- **Always Intentional:** anything within the surface area reads as always-intentional, without odd-ones-out designs, and reflects the broader codebase's resulting shape rather than remnants of, or adherence to, what's true now and is ultimately going to change. The approach reflects the outcome and isn't bound by constraints that were only relevant before. Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains.
- **Look Outward:** look for cross-file opportunities and shared design, avoiding hand-rolling or duplicating what's already there or can be adjusted to fit. Pommora is an established codebase, and this work doesn't start from scratch.
- **The Data Layer:** the complex data-level mechanics least reflect Nathan's intentions and mostly reflect what past session agents judged appropriate. Treat them with care and respect, without assuming they're beyond reasonable change; presenting an approach to Nathan may be all it takes to change the codebase for the betterment of everything in it and of future iterations. Zero data-level spaghetti, complexity, or additional 'stuff' should be added without reason. Rewiring things to become more understandable, more efficient, more appropriate, and more effective is preferred when the alternative is just adding more to something that's inherently unfit to suit the long-term mandate of what's actually being offered.

##### Principles

Nathan's, verbatim, folded as above.

- **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before, whether a developer reading code or Nathan reading file names and headers. A blind-eye review of the surface areas impacted by this implementation should find less confusion, less conflict about intent, and an unambiguously more approachable, maintainable ecosystem to iterate on.
- **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go, with no choice between layers, helpers, or modules — nothing that exists somewhere where it shouldn't; nothing implemented where something else already does it or adjusting it accordingly would be the more appropriate approach; nothing that increases the risk of misassumption when working here in the future.
- **One Way:** Each thing has one implementation, one pattern, and one source of truth. No part contradicts another. Anything changed or implemented should be reflected across the board — nothing that's done this way here, while something else works differently elsewhere, unless that's *genuinely* correct. Exceptions carry their reason where a reader meets them, in code or feature documentation.
- **Real Purpose:** Anything added to the codebase should have its purpose clearly stated with the perspective of its value enhancing what's already there — complexity, duplications, divergences, multiple ways to do the same thing — and anything "new" added should be assessed using that. Anything introduced should have independent justification behind its existence that isn't simply self-induced requirements. Line-count increases shouldn't translate into maintenance cost or complexity.

##### Perspectives

What this work looks out for, ratified by Nathan on 10-21-2026.

- **Responsibility Sets Scope:** The Properties system is everything whose job is properties, wherever it lives — `Core/Properties` and the property logic held in Views, Contexts, Nexus, the Trash, the Archive, Settings, Actions, and UIX. Code is inventoried where it sits and judged by where it belongs, and machinery Properties shares in kind with a sibling subsystem is assessed as one pattern across both.
- **Legacy Versus Interop:** Reading what other applications write — Obsidian's keys, YAML shapes, checkbox words, foreign frontmatter — is product behavior the Legibility decision protects. Reading what earlier Pommora builds wrote is migration residue, checked against the live Nexuses and removed once nothing holds the old shape.
- **Fix the Origin:** Every guard, refusal, special case, and review-round fix is traced to the state or decision that produces it. A fix that patched a symptom folds into the origin it patched, and a guard against a state no path produces leaves.
- **One Vocabulary:** Each concept carries one name across files, functions, types, and documents, and each name means one thing everywhere — value, raw, word, key, label, holder, member, definition. File names say what's inside them, near-identical siblings earn their difference or merge, and a module exports what other modules actually use.
- **Type Facts Once:** What varies by property type — decoding, encoding, formatting, sorting, filtering, grouping, icons, labels, cells, editors, pickers, and menu rows — is stated once per type. Adding or changing a type is one entry plus its genuinely unique pieces, and consumers ask the type's specification instead of re-deciding it.
- **One Write Path:** Every value change — from the panel, a picker, a cell, a menu, a mass assign, an undo, a restore, a sweep, or a repair — reaches the file through one pipeline, and the read path stays read-only by construction. A surface that writes values its own way folds into that pipeline.
- **Hot Paths Stay Cold:** Work done per cell, per row, per keystroke, or per render across property surfaces answers to the Hard Rule on expensive work, as does every sweep or rebuild with an incremental alternative. The Benchmark Nexuses settle it wherever scale decides.
- **Sync-Ready Shapes:** On-disk and in-memory shapes are assessed against Sync's per-section merging and the Mobile companion. While a shape is open for change, its known merge losses — such as `select_options` and `status_groups` each merging as one field — are weighed alongside it.
- **Describers Get Swept:** Tests, comments, feature documents, and Issues entries get the same deep clean as the code they describe. A test pins one intended behavior, duplicate coverage collapses, tests of removed or incidental behavior leave with it, and every claim the work makes false is rewritten in the same pass; the Issues entries citing Properties are pre-found work the sweep resolves or re-scopes.
- **Behavior Is a Decision:** Each user-visible behavior met along the way — an edge rule, a refusal, a confirmation, a cache, an auto-adoption, a repair — is classified as Nathan's intent, an earlier agent's choice, or an accident. Behavior-preserving changes proceed through the plan, while any behavior change, removal included, reaches Nathan as a decision carrying its evidence.

##### Nathan's Constraints

- **Take Along:** any trivial fixes to existing things, folds of existing duplication and divergence, or cleanup that would otherwise be risk-free, obvious, or stupid to ignore now are taken alongside this work.
- **Planning Direction (10-19-2026):** approaches may diverge from ratified decisions within reason; the "how" can alter slightly if it's genuinely best; the "what" actually gets built still gets brought to Nathan if there's conflict. Removal and consolidation come before anything truly additive, and changes to what exists come before new surface unless the new surface is foundational: never add something in one phase that a later phase's consolidation would have made unnecessary.
- **The Mandate (10-21-2026):** a self-contained, full-sweep deepclean of the Properties system, so that any future work on it happens inside a smaller, more cohesive codebase with less stuff, fewer ways of doing the same thing, and its legacy code cleaned. It finds what's spelled more than once, what lives where it shouldn't, what exists only for older systems and doesn't fit Pommora's long-term approach, what was a patch-on fix, and what wasn't integrated when it should have been.
- **Plain English (10-21-2026):** every finding, decision, and overview put to Nathan is explained in plain, non-technical English, with its technical evidence kept apart and complete. *Properties Restructure — Morning Report* is the reference for every overview and explanation in planning.
- **Investigate Before Designing (10-21-2026):** planning re-investigates the mechanics behind every decision against the code before designing it, and presents what Nathan asked to see — the crash-recovery files, which part of Pommora owns each, how a change flows through them today, and the proposed revision — before designing it.
- **Headless Planning (10-21-2026):** from the handoff forward, the planning session runs headlessly: planning, reviews, and every call are made against the Approach, Principles, and Perspectives without stopping for Nathan. Whatever Nathan wouldn't reasonably want any other way is decided in his place. Whatever remains genuinely his call is listed in the final reconciliation report beside the plan, for his morning. The session closes with the same plain-English walkthrough given in chat at the end of the brainstorm: everything the plan changes against what's true now, what rests on his calls, and the behind-the-scenes cleanup in simple terms. Every decision the plan has to be designed around was put to Nathan before the handoff. A push notification reaches Nathan at every decision or stopping point and after each major phase of planning.
- **Sync Stays (10-21-2026):** `Core/Sync/` and its merge rules aren't changed by this work, since Sync is expected to be rebuilt; what Sync loses today is recorded as input for that rebuild.

##### Working Rules

- **Re-Verify, Then Reuse:** a planning session re-verifies every claim it leans on against its own HEAD, and rides the mechanism that already does the job before designing anything new.
- **Intent Over Wording:** the decisions record intent. INFERRED and ASSUMED entries are readings the plan confirms against the code or puts to Nathan before building on them.
- **The Planning Pair:** *Properties Restructure — Planning Findings* carries the technical evidence, and *Properties Restructure — Decisions & Intention* is the one source for what was decided.
- **Cost:** nothing this work adds runs on a high-frequency trigger, and no sweep or rebuild walks the whole Nexus where an incremental or cached read does the job.
- **Gates:** `npm run typecheck`, `npm run test`, and `npm run lint` from the repo root; `.claude/Guidelines/Development-Environment.md` before driving the app; `~/Test` for live testing, rebuilt by `node .claude/scripts/make-benchmark-nexus.mjs test`.
- **Process:** decisions ran on `~/NexusOS/Studio/Athena/II. Drafts/Studio-Brainstorm-V2.md` and planning runs on `~/NexusOS/Studio/Athena/II. Drafts/Plan-Creation.md`. Their blank sections take the installed `studio-brainstorm` and `writing-plans` skills' guidance, and the processes they name without spelling out take the shape of `.claude/Planning/Completed/Archive/Archive — Plan.md`; the drafts win where they conflict.
- **Models (Nathan, 10-19-2026):** execution agents run `opus-medium`; there are no hand-checks, so every visual surface is driven over CDP. The plan's phases are designed one at a time with an advisor checkpoint before each is written.
- **Reviews:** the plan, its execution, and the landed work are reviewed as *§Review Procedure* sets out.
- **Handoffs:** every handoff on this work repeats the Approach, Principles, Perspectives, and Nathan's Constraints verbatim.
- **Names:** no personal names in anything committed outside `.claude/`, commit messages included.

##### Review Procedure

Adopted from the Archive plan (`.claude/Planning/Completed/Archive/Archive — Plan.md` *§Constraints › Models and Reviews* and *§Final Verification*, as run in `.claude/sessions/10-19-2026-Archive—Execution-&-Final-Verification.md`). Every reviewer brief carries the Approach, Principles, Perspectives, and Nathan's Constraints verbatim, except a neutral reader's, which carries none of them. Each wave closes before the next opens.

**Plan Reviews**

1. **Wave One:** two `opus-xhigh` read-only reviewers over the whole drafted plan. One leads on the frame and the data-layer phases, and the other on the interface phases. Each is briefed with the decision log as the list not to re-litigate, and with the `closeout-review` perspectives: correctness, simplification, cohesiveness, and consequences. Both read the plan's shape first and read outward, looking for:
   - sequencing faults;
   - consolidation a later phase makes possible;
   - anything a task adds that an adjacent task makes unnecessary or confusing;
   - anything additive that should have been a change to what exists;
   - machinery the behavior doesn't need, with line growth used only as a pointer;
   - anything the plan asserts about the tree that isn't true.

   Each finding is verified against the tree. One fold agent applies what holds, and what doesn't is logged with its reason.
2. **Wave Two:** two fresh `opus-xhigh` reviewers over the folded plan, under the same brief, leading on correctness: what wave one's folds broke, and the savings it missed. Its findings are folded the same way.
3. **Neutral Read:** one `opus-xhigh` agent that wrote and reviewed nothing, given only the plan file and the tree, is asked whether it would execute the plan cold and what it would change. The plan's own *§Constraints* is its only priming. What holds is folded.
4. **Own Read:** the orchestrator reads as the executor would, runs the spec sweep (every decision maps to a task or an approved exclusion), reads for conflicts last, and checks in with the advisor.
5. **Presentation:** the plan reaches Nathan as a phase-by-phase account of what each phase builds, removes, changes, and consolidates, and why it's its own phase. With it come the ledger, with any growth justified, numbered Last Calls with recommendations, and the Open Items. Ratification is his.

Removal and consolidation come before anything additive, and changes to what exists come before new surface unless the new surface is foundational.

**Execution Reviews**

- **Phase Checkpoints:** two `opus-high` read-only reviewers to `closeout-review`'s standards, one for simplification and one adversarial, with their findings fixed before the next phase opens.
- **Mid-Plan Neutral Gate:** where a milestone completes the data layer, one `fable-high` agent is given only the baseline head, that milestone's head, and a plain statement of what the work intended, with no plan, log, document, or skill. It answers yes or no on whether the result holds, and is re-run after each fold until it answers yes.
- **Documentation Phase:** one `opus-high` spotcheck against the Studio documentation reference before its commit.

**Post-Plan Reviews**

1. **Wave One:** two `opus-xhigh` read-only reviewers over `BASELINE..HEAD`, briefed with the `closeout-review` perspectives.
   - **Inward:** correctness first (a defect an ordinary action reaches, data that can be lost, a cost on a frequent path, a broken invariant), then simplification within the diff.
   - **Outward:** cohesion with the rest of Core, UIX, and Desktop, odd-ones-out, and anything done one way here and another way elsewhere.

   Each reports findings ranked by severity with `file:line`, the open questions with the check that settles each, where the code drifted from the plan, and insights. One fix agent folds them as numbered fixes plus a Not Taken list, and the fold is committed.
2. **Wave Two:** two fresh `opus-xhigh` reviewers, one inward and one outward, over the folded range. Their findings are folded and committed.
3. **Neutral Gate:** one `fable-high` agent given only the baseline head, the final head, and the intention statement, with no plan, document, or skill. It gives a yes-or-no verdict, its corrections, and the strengths to keep, and is re-run after each fold until it answers yes on every lens.
4. **Spotcheck:** any fold made after the gate gets one `opus-xhigh` spotcheck against the principles alone.
5. **Closeout:** the full drive on the final head and the orchestrator's own pass. Only then come the history entry, `save-session`, `save-delta`, and the report.

---

#### Process

1. **Alignment:** the principles, scope, and session shape ratified with Nathan.
2. **Inventory:** Plan-Creation's Large exploration — domain scouts writing scratchpad reports, two reconciliation agents cross-verifying them, and one synthesis agent writing *Properties Restructure — Investigation* with each cleaned report beside it.
3. **Assessment:** the Investigation and every cleaned report read in full, load-bearing claims re-checked against the code, and conflicts disclosed to Nathan.
4. **Decisions:** Studio-Brainstorm-V2 over every finding that needs Nathan, recorded in *Properties Restructure — Decisions & Intention*.
5. **Plan:** Plan-Creation, from the ratified decisions, run headlessly as *§Nathan's Constraints › Headless Planning* sets out.
6. **Execution:** the ratified plan, phase by phase, closed by its *§Final Verification*.

#### Procedure Sources

Nathan's drafts in `~/NexusOS/Studio/Athena/II. Drafts/` lead; where a draft section is still blank, the current Studio skill's equivalent fills it, and the drafts themselves stay as written.

| Draft Section | Filled From |
| ------------- | ----------- |
| Studio-Brainstorm-V2 *§Initial Investigation* | Plan-Creation *§Exploration Procedures*; `studio-brainstorm` *§A* (adjacencies, verified absolutes, one thing or several) |
| Studio-Brainstorm-V2 *§Incremental Interrogation* | Studio-Brainstorm-V2 *§Asking Questions*; `studio-brainstorm` *§C* |
| Studio-Brainstorm-V2 *§Prioritization & Pushback* | `studio-brainstorm` *§E* (two-to-three real approaches, forecast reconciliation) and *§F* (Core versus Prospects) |
| Studio-Brainstorm-V2 *§Review & Reconciliation* | `studio-brainstorm` *§G–I* (convergence, self-review, independent review of up to three rounds) |
| Plan-Creation *§Exploration Principles* | `writing-plans` *§1.4* (simplest wins, reuse before invention, YAGNI; return, approaches, absorb, stop) |
| Plan-Creation *§Implementation & Design* | `writing-plans` *§1.5* (constraints, the Removal and Refactor shapes) and *§2* |
| Plan-Creation *§Review & Ratification* | `writing-plans` *§3–4* |
