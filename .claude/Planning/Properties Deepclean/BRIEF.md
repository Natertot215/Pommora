### Properties Deepclean — Brief

**DATE:** 10-21-2026
**STATUS:** RATIFIED 10-21-2026

The standing principles and process for the Properties Deepclean — a self-contained, full-sweep inventory, assessment, and deep clean of Pommora's Properties system. Every planning document, agent dispatch, session handoff, and continuation procedure copies *§Principles* and *§Look Out For* one-for-one, in the wording below. The project and global `CLAUDE.md` files still hold the conventions that apply everywhere; where a ratified decision is more specific than a principle here, the decision wins.

#### The Documents

- ***Properties Deepclean — Decisions & Intention***: the intent, authoritative once ratified, tagged CONFIRMED, INFERRED, or ASSUMED.
- ***Properties Deepclean — Investigation***: the synthesized inventory and the cleaned scout reports beside it.
- ***BRIEF.md***: this document.

---

#### Principles

- **Removal First:** any approach first assesses what's true *now* that could be removed, deleted, changed, consolidated, or replaced. The design isn't based on what's currently there with its course adjusted; it ensures totality-first application, removal-first scoping, and residue-eliminating frameworks that provide a clean slate rather than building changes on top of what's ultimately going to be replaced.
- **Consolidation First:** the codebase ends up more understandable, less complex, more efficient in what it does, less conflicting in defining that, and an overall cleaner foundation to work within.
- **Less Stuff:** nothing new is added unless there's evidence it's required, and nothing carries more functions, helpers, wrappers, types, layers, and call sites than necessary, with no logic stated twice. New code earns its place by removing more than it adds, fixing incorrect behavior, or delivering required behavior in its minimal form. The work ends with cumulatively less in the codebase overall — fewer ways to do similar things, less complexity, fewer paths to go through, less tech debt waiting to surface, fewer things to maintain, and fewer headaches in future work — while the line count *may* end up positive. Net-negative lines are the north star, and any net-positive gain has its rationale genuinely backed by this framework and the principles here.
- **Real Purpose:** Anything added to the codebase should have its purpose clearly stated with the perspective of its value enhancing what's already there — complexity, duplications, divergences, multiple ways to do the same thing — and anything "new" added should be assessed using that. Anything introduced should have independent justification behind its existence that isn't simply self-induced requirements. Line-count increases shouldn't translate into maintenance cost or complexity.
- **Always Intentional:** anything within the surface area reads as always-intentional, without odd-ones-out designs, and reflects the broader codebase's resulting shape rather than remnants of, or adherence to, what's true now and is ultimately going to change. The approach reflects the outcome and isn't bound by constraints that were only relevant before. Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains.
- **Look Outward:** look for cross-file opportunities and shared design, avoiding hand-rolling or duplicating what's already there or can be adjusted to fit. Pommora is an established codebase, and this work doesn't start from scratch.
- **One Way:** Each thing has one implementation, one pattern, and one source of truth. No part contradicts another. Anything changed or implemented should be reflected across the board — nothing that's done this way here, while something else works differently elsewhere, unless that's *genuinely* correct. Exceptions carry their reason where a reader meets them, in code or feature documentation.
- **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go, with no choice between layers, helpers, or modules — nothing that exists somewhere where it shouldn't; nothing implemented where something else already does it or adjusting it accordingly would be the more appropriate approach; nothing that increases the risk of misassumption when working here in the future.
- **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before, whether a developer reading code or Nathan reading file names and headers. A blind-eye review of the surface areas impacted by this implementation should find less confusion, less conflict about intent, and an unambiguously more approachable, maintainable ecosystem to iterate on.
- **The Data Layer:** the complex data-level mechanics least reflect Nathan's intentions and mostly reflect what past session agents judged appropriate. Treat them with care and respect, without assuming they're beyond reasonable change; presenting an approach to Nathan may be all it takes to change the codebase for the betterment of everything in it and of future iterations. Zero data-level spaghetti, complexity, or additional 'stuff' should be added without reason. Rewiring things to become more understandable, more efficient, more appropriate, and more effective is preferred when the alternative is just adding more to something that's inherently unfit to suit the long-term mandate of what's actually being offered.

#### Look Out For

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

---

#### Process

1. **Alignment:** the principles, scope, and session shape ratified with Nathan.
2. **Inventory:** Plan-Creation's Large exploration — domain scouts writing scratchpad reports, two reconciliation agents cross-verifying them, and one synthesis agent writing *Properties Deepclean — Investigation* with each cleaned report beside it.
3. **Assessment:** the Investigation and every cleaned report read in full, load-bearing claims re-checked against the code, and conflicts disclosed to Nathan.
4. **Decisions:** Studio-Brainstorm-V2 over every finding that needs Nathan, recorded in *Properties Deepclean — Decisions & Intention*.
5. **Plan:** Plan-Creation, from the ratified decisions.
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
