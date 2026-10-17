### Path Links — Brief

**DATE:** 10-16-2026

The standing principles, philosophies, and working rules Nathan holds planning and execution to, written once here so no prompt has to repeat them. They govern the plan built from *Path Links — Decisions* and every session that executes it. The project and global `CLAUDE.md` files still hold the conventions that apply everywhere (formatting, writing, commits, gates); this brief adds what this work stands on, and where a decision is more specific than a principle here, the decision wins.

#### The Documents

- ***Path Links — Decisions***: the intent, authoritative. Thirty-nine lettered decisions (A to G), each tagged CONFIRMED, INFERRED, or ASSUMED based on how clearly Nathan stated it, along with the constraints, rejected alternatives, the one open item, and the sources.
- ***Path Links — Scout Findings***: every scout's verbatim brief and report from the decision rounds, each marked with what a later decision superseded, and the three mechanism forks the scouts left open.
- ***BRIEF.md***: this document.

---

#### Guiding Principles

Nathan's, verbatim; every judgment in planning and execution answers to them.

- **Less to Carry:** No more functions, helpers, wrappers, types, layers, and call sites than necessary, and no logic stated twice. New code earns its place by removing more than it adds, fixing incorrect behavior, or delivering required behavior in its minimal form.
- **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before, whether a developer reading code or Nathan reading file names and headers. A blind-eye review of the surface areas impacted by this implementation should find less confusion, less conflict about intent, and an unambiguously more approachable, maintainable ecosystem to iterate on. 
- **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go, with no choice between layers, helpers, or modules — nothing that exists somewhere where it shouldn't; nothing implemented where something else already does it or adjusting it accordingly would be the more appropriate approach; nothing that increases the risk of misassumption when working here in the future.
- **Reads as Designed:** Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains.
- **One Way:** Each thing has one implementation, one pattern, and one source of truth. No part contradicts another. Exceptions carry their reason where a reader meets them, in code or feature documentation.
- **Real Purpose:** Anything added to the codebase should have its purpose clearly stated with the perspective of its value enhancing what's already there — complexity, duplications, divergences, multiple ways to do the same thing — and anything "new" added should be assessed using that. Line-count increases shouldn't translate into maintenance cost or complexity.

#### Standing Principles

Nathan's, verbatim, carried from the Connections & Aliases Restructure and restated at the start of this work.

- "Anything within our surface area should be left reading as always-intentional, without any odd-ones-out designs, and be reflective across the broader codebase."
- "Ensure we're looking *outward* for cross-file opportunities and shared design, avoiding hand-rolling or duplicating what's already there or can be adjusted accordingly."
- "Make decisions based on actual necessity without sacrifices or being negligent, but don't overcomplicate or over-engineer things when its maintainability and complexity outweigh the actual purpose."
- "Anything introduced should have independent justification behind its existence that isn't simply self-induced requirements."
- "Consider various perspectives, multiple alternatives, and potentially relevant opportunities before deciding upon an approach or isolating options."
- "Anything changed or implemented should be reflected across the board — nothing that's done this way here, while something else works differently elsewhere, unless that's *genuinely* correct."
- "Each responsibility is clarified and reads totally intentional, and the next change of a kind has one obvious place to go, with no choice left between layers, helpers, or modules. Complexity relocated, renamed, or exchanged for new complexity of similar weight counts as no improvement."
- "We shouldn't simply port behavior that should be relocated when that's the better long-term approach."
- "We shouldn't leave anything half-done, deliberately divergent, or deferred when doing so would undermine cohesion, completion, and always-intended behavior."
- "Time and time again, past sessions have hand-rolled, re-implemented, or created near-duplicate designs of what already exists instead of using established shared things, or changing the near-duplicates to allow reuse — that's one of the core perspectives we must consider when evaluating any approach."
- "Zero data-level spaghetti, complexity, or additional 'stuff' should be added without reason. Rewiring things to become more understandable, more efficient, more appropriate, and more effective is preferred when the alternative is just adding more to something that's inherently unfit to suit the long-term mandate of what's actually being offered."
- "There's opportunity for ending this with 'less stuff' and 'fewer ways to do the same thing, or unifying things that are unnecessarily different'."
- "Odd-ones-out aren't allowed. Alignment work must reduce complexity and improve the codebase overall (net-less)."
- "Ensure anything that resides within the data-layer and mutation lenses of this work does so cohesively and confidently coherent with the rest of the codebase and the intended paths."
- "Resolve this with totality at its simplest form and most coherent source"; "truly always intended, consistent, and architecturally aligned… total cohesion within the system as if there wasn't any asymmetry to begin with."
- "The result should read cohesively as a system; not just patch-on or independent tweaks or fixes."

#### In His Words, This Work

What Nathan kept returning to while the decisions were made, verbatim.

- "One rule is the core discipline we've instilled."
- "Less machinery for stuff that we shouldn't include is a valuable perspective here."
- "We should look for the simplest solution within the already-established design where possible."
- "Name everything you think you need to add or include and look for what already exists first."
- "This is pre-existing duplication that should be merged."
- "Again, real consolidation opportunities are showing up here."
- "Treat this with the goal of making the outcome read as the architecture surrounding it always intended it, even if it means changing root-level things."

---

#### Philosophies

- **Simplicity First:** the simplest design that meets the intent wins over the robust one that reaches the same result; a guard, a layer, or a test for a state the code can't produce is scope creep.
- **Cohesion:** a change reads as part of the system around it, with the same names, owners, and paths the neighboring code uses, and nothing done one way here and another way elsewhere.
- **Maintenance:** every change is responsibility inherited forever, so the next reader, and the next change of the same kind, decides what a design is worth.
- **Reuse Before Invention:** what already exists, or nearly does, is found and bent to fit before anything is written beside it; a near-duplicate is changed to allow reuse rather than joined by a third.
- **Fold, Don't Add:** a new behavior lands as a merge into what already owns its kind wherever one does, and a pre-existing duplication the work touches is merged rather than left.
- **Root-Level Changes Are Welcome:** where the always-intended shape needs a root-level change, it's made, rather than patched around at the leaves.
- **Every Addition Earns Its Place:** the honest count is reported with removals and additions apart, and what each addition buys is stated beside it.

#### Working Rules

1. **Look Outward First:** before designing any piece, name every function, field, file, or rule it would add, and scout what already exists for each.
2. **Verify Nathan's Claims:** check every architectural claim he makes against the tree and report what contradicts it, plainly; he wants it. Many were wrong during the decisions, and each correction changed the design.
3. **Ask, With a Read Attached:** where an answer reads more than one way, stop and ask, with what was found, what it implies, and the call put up for correction; Nathan isn't technical, so each question is explained in plain terms.
4. **Disclose In-Flight Calls:** a judgment made during planning or execution is stated in chat when it's made, and recorded where it changes an outcome.
5. **Write With Intent:** decisions and plans state intended behavior as intent ("should"), separate from statements of how the code works today, so a future reader never takes a decision for a fact or a fact for a decision.
6. **Keep the Evidence:** every scout's brief and report is saved verbatim beside the plan, so a later session's scouts can return to its sources.

---

#### Planning

- **Entry:** the plan is written through the `writing-plans` skill (`.claude/skills/writing-plans`), from *Path Links — Decisions* as its source, into this folder as *Path Links — Plan*.
- **Phase by Phase, Explained First:** before writing each phase, the planner relays in chat, precisely and in plain terms, the approach that phase takes (what it changes, what it reuses, what it removes, and why), then continues straight into writing it; the explanation is disclosure, not a stop.
- **Plan Reviews:** the plan's reviewers are `opus-xhigh` agents reading for outward cohesion and coherence with the codebase around the change, for simplification, and for always-intended design, rather than for whether the work merely functions in isolation.
- **The Advisor Checkpoint, Then the Neutral Read:** once the scouts' findings are reconciled and the mechanism forks settled with evidence, the advisor reads the approach for cross-opinion and reconciliation before any fork that needs Nathan is put to him and before a line of the plan is written; the finished plan then gets one neutral read, by a `fable-high` agent unless the planner's own self-review finds an `opus-xhigh` agent the more efficient reader, a call the planner makes and discloses (Nathan, 10-16-2026). Each neutral read answers whether it would inherit the result as designed, and the next step folds in its findings. For this plan the owner replaced that neutral read with one `opus-high` scout for what should change, run after the two reviews and the self-review (Nathan, 10-16-2026).
- **The Neutral Review:** once the planning session begins, dispatch one `haiku-high` agent to pull the neutral review process from the plans that carry one (the Connections & Aliases Restructure plan's *§Constraints · Neutral Gate* and *§Final Verification* above all, and any other plan in `.claude/Planning/` with a neutral gate, such as *Heading Opener — Plan*) and relay it verbatim, so the plan borrows the established process rather than writing a new one.
- **The Gate:** the plan ends behind a `fable-high` neutral reviewer given only the baseline head, HEAD, and this intention, with no plan, log, or document: *"Pommora's page links named pages by title alone, so two pages sharing a title couldn't be told apart, and its link cascades, searches, and clicks on unresolved links each worked their own way. This work lets a link name a page by its path from the Nexus root, written and read as Obsidian does, keeps every link pointing at its page through renames, moves, folder changes, collisions, and restores made inside or outside the app, makes every search match one way, and seats a click on an unresolved link in its title, with each rule stated once, built from what the architecture already had, and nothing left over."*
- **Scouts:** the planning session's scouts start from *Path Links — Scout Findings*, re-verify every citation at HEAD, and treat its three mechanism forks as open.
- **Dependency Order:** the order the scouts established: the grammar and the reader, then the index's link key, the resolver, the writers, the search fold, the click rule (after picks write paths and location matching lands, decision C-6), the in-app re-spell, the outside-move lane, and the Trash's record and repair, all on whatever the Heading Opener's revert lands (decision A-9).
- **Highlighting:** decision D-6 stays its own task, as the decision asks, so a reversal leaves the matcher untouched.
- **The Number:** the scouts' rough estimates sum to about +80 to +140 production lines before the search fold's roughly −15. Nathan's bar is that every addition earns its place and the outcome reads as intended, with the merges counting toward a codebase left with less, rather than a fixed floor; each phase is measured with `view-delta` and reported with removals and additions apart, and no plan promises a number its design can't deliver.
