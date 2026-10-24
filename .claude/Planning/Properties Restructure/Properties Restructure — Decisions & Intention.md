### Properties Restructure — Decisions & Intention

**DATE:** 10-22-2026
**STATUS:** Ratified (10-22-2026)

### Context

Pommora's Properties system is everything whose job is properties: the property list in `.nexus/properties.json`, the values pages carry in their front matter and Spaces carry in their settings files, the editors and pickers that change them, the views that filter, sort, and group by them, and the machinery that rewrites many files when a property changes. It grew across many sessions, and most of its data-level mechanics reflect what earlier agents judged appropriate rather than Nathan's stated intent.

The restructure began with a full-sweep inventory at `d0595b22d`, verified at `a0f7dc6ff`: nine domain scouts, two reconcilers, and a synthesis inventoried it. Every finding that changes something a user sees or something saved to disk was then put to Nathan in plain terms, and his answers are recorded here.

### Overview

This log is the authority on intent for the restructure. It records which of today's behaviors are kept as intentional, which change and how, and what planning investigates against the code before designing each change. *BRIEF.md* holds the principles every planning document answers to, *Properties Restructure — Implementation Plan* builds each decision into its phases, and Nathan ratifies this log with the plan.

Most decisions fix accidents or fold duplicated machinery into one shape; a few change visible behavior on purpose, such as giving every option a permanent id, giving every property, Context, and Space its own crash-recovery note, and making undo put back what the file held. Sync's merge rules stay as they are while Sync awaits its rebuild, so the merge losses found here are recorded as inputs for that rebuild, as *§Prospects* notes.

#### Concepts

- **Property List:** `.nexus/properties.json`, the Nexus-wide list of property definitions, each with a permanent id, a label, a type, and its type's settings.
- **Front Matter:** the block of properties at the top of a page's Markdown file, where a page holds its values; a Space holds its values in its own settings file, `_space.json`.
- **Label Format and Value Format:** a property's settings for how its key and its values are spelled in front matter; changing either rewrites every file that holds the property.
- **The Stash:** the store of values a Remove takes off a Collection's pages, kept in that Collection's settings file, `_pagecollection.json`, so re-adding the property brings them back.
- **Crash-Recovery Note:** an item's entry in `.nexus/.owed.json`, written before a change that rewrites many files, saying what the change is, so Pommora can finish it after a crash or an unreachable file; such a change is "owed" until it reaches every file.
- **Try Again:** the action offered when a change couldn't reach every file, which runs the unfinished part again.
- **Option Id:** a permanent id on each Select, Multi-Select, or Status option, which views, tiles, and the Matrix filter refer to in place of the option's word; pages keep storing the word.
- **Filedata:** Title, Created Time, Last Modified Time, and Location, the built-in fields Pommora reads from a file itself and its place in the Nexus rather than from its front matter; none of them is a property type.
- **Reach:** the set of files a change rewrites; a property change reaches the pages of Collections and the Archive, while a Context or Space change reaches any page in the Nexus.
- **Tidy-Ups:** the small rewrites any edit applies to a page's other properties, such as turning a single-word Select into a one-item list or collapsing duplicates.
- **Partial Mark:** a Trash entry's flag recording that some values couldn't be read when the entry was made.
- **Format and Style:** a property's Format is set on the property and applies across the Nexus; a column's style is a per-view display setting.

---

### Decisions

#### A - Restructure Setup

- **A-1 [CONFIRMED]:** The restructure answers to the Approach, Principles, Perspectives, and Nathan's Constraints under *§Constraints*, held in *BRIEF.md* and copied one-for-one into every planning document, agent dispatch, session handoff, and continuation procedure.
- **A-2 [CONFIRMED]:** The scope is the Properties system by responsibility — `Core/Properties` and the property logic held anywhere else — including the journal, replay, and sweep machinery Contexts and Properties each carry for one pattern (I-036).
- **A-3 [CONFIRMED]:** The Archive work is complete, and how it changed the Properties system's reach into archived files is current ground truth for the inventory.
- **A-4 [CONFIRMED]:** No Nexus beyond NexusOS, `~/Test`, and the Benchmark Nexuses needs to keep reading, so a read path for a shape only earlier Pommora builds wrote becomes removable once a scan of those Nexuses finds nothing holding it.
- **A-5 [CONFIRMED]:** A Multi-Select registering the unknown and externally-added words its members hold as options is intended behavior and stays.
- **A-6 [CONFIRMED]:** Finding the behaviors Nathan never asked for is part of the restructure's mandate, and each one reaches him as a decision carrying its explanation.
- **A-7 [CONFIRMED]:** The brainstorm closes in this session, planning runs headlessly from the handoff as *§Constraints › Nathan's Constraints › Headless Planning* sets out, and execution follows in fresh sessions once Nathan ratifies the plan.

#### B - Crash Recovery

- **B-1 [CONFIRMED]:** Every property, Context, and Space is meant to keep its own crash-recovery note, so unfinished work on one never blocks or unprotects a change on another, and every change that rewrites many files writes one. Planning presents the current file structure — which recovery files exist, which part of Pommora owns each, and how a change flows through them today — beside the proposed revision before designing it.
- **B-2 [CONFIRMED]:** Every change that rewrites many files is meant to update the property or Context list first and the files second, as a property rename does today.
- **B-3 [CONFIRMED]:** A delete that can't reach every page finishes what it can and offers Try Again for the rest, for properties, Contexts, and Spaces alike.
- **B-4 [CONFIRMED]:** Creating a property under the name of a deleted property whose cleanup is still unfinished is refused with the general unfinished-change message, and its Try Again gives that cleanup another run; the new property doesn't take the cleanup over.

#### C - The Removed-Values Stash

- **C-1 [CONFIRMED]:** Removing a property from a Collection keeps taking its values off the Collection's pages and keeping them in the stash, so re-adding the property brings them back; Nathan's July ruling of no dormant foreign values on pages (7-2 C-3, C-6) stands.
- **C-2 [CONFIRMED]:** The stash is meant to lose nothing under sync, drop entries for pages that have left the Collection, and let a Remove that missed pages be retried. Planning investigates every issue around the stash that keeps this behavior intact, and proposes a better home for it than the Collection's settings file where it finds one.
- **C-3 [CONFIRMED]:** The stash stays in the Collection's own settings file, and its entries are kept for the page history timeframe (the History Timeframe setting), after which they're cleaned out; the stash likely needs a timeframe of its own, filed as I-077. A stash block holds only its values today, with no record of when it was made, so the cleanup records each entry's age. Its sync loss stays a Sync rebuild input (H-2).

#### D - Options and Groups

- **D-1 [CONFIRMED]:** Every option is meant to carry a permanent id, the way properties already do, so views, tiles, the Matrix filter, and the preview rules refer to options by id and an option rename stops rewriting them; pages keep storing the option's word, so a rename still rewrites the pages holding it, and sync merging options one at a time waits on the Sync rebuild (H-2). NexusOS's views, tiles, and property list that name options by label are converted once.
- **D-2 [CONFIRMED]:** Collapsed groups are meant to be remembered per property, as hidden groups already are, with NexusOS's existing collapsed groups converted rather than reopening once.
- **D-3 [CONFIRMED]:** Status options stop storing their group's id, with NexusOS's property list stripped of it once.

#### E - Undo

- **E-1 [CONFIRMED]:** Undo is meant to put back what the file held, recorded by the part of Pommora that writes the file, rather than re-sending what a cell or the panel showed.
- **E-2 [CONFIRMED]:** Undo puts back only the property that was edited, leaving the tidy-ups the edit made to other properties on the page in place.
- **E-3 [CONFIRMED]:** Undoing a Link value also takes back the page alias that value added.
- **E-4 [CONFIRMED]:** Every put-back lands a front-matter line where it stood rather than at the end, across all front matter: undo, a property's Trash restore, a removed property's re-add, a Context or Space restore's tags, and a Link key a page delete took away when that page comes back. A line lands above the line it stood above, and last when that line is gone. A Clear or an uncheck removes the line and never leaves an empty one (Nathan, 10-23-2026: "have undo put it back across ALL frontmatter"; "trash should use the most cohesive behavior, clear doesn't leave empty lines ever"; "Restores should behave the best way possible. Make the choice that we'd wish we went for in a year. Same place, not at the bottom.").

#### F - Property Types

- **F-1 [CONFIRMED]:** Context stays a property type.
- **F-2 [CONFIRMED]:** Created Time and Last Modified Time are meant to leave the property types and become their own kind of file-derived field, named Filedata, in the same category as a page's Aliases and its ID where that fits. Planning investigates what already exists for those fields and where they belong before naming or placing them, noting that "metadata" already names the page metadata in `Core/Nexus/pageMetadata.ts` and `.nexus/metadata/`. The group is named Filedata.
- **F-3 [CONFIRMED]:** Title and Icon are built-in fields rather than property types, so the property types hold the nine user types plus Context. Planning investigates how Icon is held today alongside Title.

#### G - Reach

- **G-1 [CONFIRMED]:** Finding which pages and Spaces hold a property or a tag is meant to run through one shared mechanism, the best available scan for both, unless planning finds evidence that one of them needs its own.
- **G-2 [INFERRED]:** A change reaches every file where its key means something: a property's key means something on the pages of Collections and the Archive, and a Context tag means something on any page, including loose pages outside every Collection, so the one mechanism keeps that difference as its stated rule.
- **G-3 [INFERRED]:** A restore from the Trash that can't update a Space's settings file or a returning page still completes, and a warning names what it missed.
- **G-4 [CONFIRMED]:** G-3's warning is written once, where Phase 11B's notes report a restore's misses, rather than in Phase 10 and rewritten in Phase 11B; until 11B lands, a restore's Space misses go unreported as they did before the work (Nathan, 10-23-2026: "Avoid churn, write it once during 11B").

#### H - Sync

- **H-1 [CONFIRMED]:** Sync's merge rules stay as they are, since Sync is expected to be rebuilt soon. The losses that come from how Sync merges are recorded under *§Prospects* as inputs for that rebuild, and a fix here is taken only where it removes the problem without adding a rule to how Sync works.
- **H-2 [INFERRED]:** The stash losing nothing under sync (C-2) and options merging one at a time under sync (D-1) are inputs for the Sync rebuild; option ids still land for what they fix outside Sync, and they're what per-option merging would key on.

#### I - Formats and Styles

- **I-1 [CONFIRMED]:** How the property settings panes are laid out, and how a row's wording says whether it sets the property or only the current view, stay as they are and are filed as I-076 for Nathan's own later pass; this work moves only a setting that's genuinely misplaced or genuinely confusing, and leaves the rows' wording, such as the Date and Decimals rows, as it reads.
- **I-2 [CONFIRMED]:** Each type's settings keep reaching where they reach today. A Date's display stays per view, following the Settings window's Date Format and Time Format until a view picks its own, with nothing about it on the property. A Link keeps its Format on the property as the default every view shows, a column's menu overriding it for that view, and its Underline and Color on the property, Color falling back to the Settings window's External Link Color. A Number keeps Format, Currency, Separators, Decimals, and Fraction on the property and its Number or Bar look per view. A Checkbox keeps its Color on the property, falling back to the Settings window's Checkbox Color, and its Checkbox or Switch look per view.
- **I-3 [CONFIRMED]:** A Link property whose Format was never set may follow the existing Default Link Format setting rather than a fixed default, where planning finds that cohesive; that setting is kept per device today and governs the format an external link is pasted with, so planning weighs that difference before tying them together, and otherwise leaves the default as it is.
- **I-4 [CONFIRMED]:** A column's right-click names Number's Number or Bar choice "Style," as every other type's look reads there, while a Link's display choice and the date and time choices of a Date, Created Time, or Last Edited Time column read "Format," since they set how the value is written (the dates ruled 10-23-2026); I-076's note on the column menu's wording is rewritten to match when this lands.

#### J - Value Surfaces

- **J-1 [CONFIRMED]:** A filter's date picker is meant to use the column's clock, and text holding only spaces counts as empty on every surface.
- **J-2 [CONFIRMED]:** Unchecking a checkbox keeps removing its key by default.
- **J-3 [CONFIRMED]:** A Link row's label in the Properties panel gains the value's Edit and Rename on right-click, where planning finds that's the cohesive move.
- **J-4 [CONFIRMED]:** The text editor pen's spoken label reads "Open In Editor."
- **J-5 [CONFIRMED]:** A row added in the Properties panel stays shown while it's empty, since adding it signals the user means to fill it, and it shows as a blank row on every other page; the behavior is open to cleanup like everything else.
- **J-6 [CONFIRMED]:** Cards keep hiding a chip's remove button below 80% zoom.
- **J-7 [CONFIRMED]:** Adding a File value from a card's chooser keeps its typed-path field, as cards' file handling is intended.
- **J-8 [CONFIRMED]:** Whether the value picker can create Status options is planning's to recommend.
- **J-9 [CONFIRMED]:** Clearing a property a page or a Space doesn't hold tidies the holder's other properties on both, as a page does today, unless planning finds a meaningful simplification in having it tidy neither.
- **J-10 [CONFIRMED]:** A value's right-click menu reads the same wherever it opens — the table, a card, or the Properties panel — so the panel's right-click on a File value gains Remove, and planning folds any blatant divergence between the menus and takes the consolidation it finds.

#### K - View Edges

- **K-1 [CONFIRMED]:** A filter value Pommora can't read is meant to be ignored rather than matching every page, a Checkbox's "is not empty" filter is meant to work, and deleting the property a view groups by keeps which folders were collapsed.
- **K-2 [INFERRED]:** Empty values sort last in either direction for every type except Checkbox, whose unchecked box sorts as a value, first ascending and last descending; dragging a row into another value's run in a sorted view keeps reassigning its value.

#### L - Property Editors

- **L-1 [CONFIRMED]:** Every type's editor is meant to share one layout with its spacing fixed.
- **L-2 [CONFIRMED]:** Every type's settings rows carrying an icon as the Date editor's do is meant to happen, and is filed as I-076 beside I-1's settings-pane pass rather than done in this work.
- **L-3 [CONFIRMED]:** The Decimals picker keeps reading "Hidden" when unset, and a fraction denominator of zero or less is refused.
- **L-4 [CONFIRMED]:** The option popup's title field and footer stay as they are, and planning raises where they differ from the app's standard pieces.

#### M - Chip Glyphs

- **M-1 [CONFIRMED]:** A Select's compact chip keeps its tag icon, with the feature document corrected to match.
- **M-2 [CONFIRMED]:** Status groups a user creates keep the dashed-circle icon.

#### N - Trash Records

- **N-1 [CONFIRMED]:** A Trash entry's partial mark is meant to show on the entry in the Trash, and a restore that comes back partial tells the user so in one form or another.
- **N-2 [CONFIRMED]:** Deleting a property keeps creating a Pommora Trash entry in either Trash mode.

#### O - Confirmations and Defaults

- **O-1 [CONFIRMED]:** An option's Remove is labeled Delete, so Remove only names something that can be undone or restored.
- **O-2 [CONFIRMED]:** Every confirmation for removing, clearing, or deleting a property or an option is meant to count the Items it affects correctly, zero included, and name them in one consistent vocabulary, with that counting and wording living in one appropriately placed home that the Archive's and the Trash's confirmations share where they ask the same kind of question.
- **O-3 [CONFIRMED]:** Repair Properties On Open is on by default.
- **O-4 [CONFIRMED]:** Creating a property under a taken name tells the user it took a numbered name.
- **O-5 [CONFIRMED]:** An editor whose property disappears returns to the property list.
- **O-6 [CONFIRMED]:** A damaged property list opens the Nexus with Properties marked unreadable, as Contexts already do.

#### P - Edge Rules

- **P-1 [CONFIRMED]:** A Select or Status holding several words ignores the ones no option names, shows the most recently added valid option, and tidies to that one value on the next change. Planning checks where this differs from today's rule of showing the last registered word.
- **P-2 [CONFIRMED]:** Picking a Select value drops words no option names, a Multi-Select pick keeps them after the picked options, and a Context pick drops Space names Pommora can't find, as today.
- **P-3 [CONFIRMED]:** The remaining edge rules *Properties Restructure — Planning Findings*' *§Edge Rules* lists stay as they are.
- **P-4 [CONFIRMED]:** A Space listed twice on a page reads once, as a repeated Multi-Select or File entry does, and the chip code that kept repeats apart leaves.
- **P-5 [CONFIRMED]:** Pommora never leaves an empty property line: a property's or Context's key whose value is blank (bare, null, empty, only spaces, or an empty list) comes off the page on every write, tidy, and undo, reads as empty, and is filled by a restore or re-add; keys Pommora doesn't govern are left alone (Nathan, 10-23-2026: "spaces-only are empty and should be removed"; "Option B. That's what I've over-and-over again told you").
- **P-6 [CONFIRMED]:** The refusal of a Space linking itself leaves, since no path produces that request (Nathan, 10-23-2026).
- **P-7 [CONFIRMED]:** A banner that can't be assigned because its file can't be read says "That file could not be read." (Nathan, 10-23-2026), and the History Timeframe row keeps its planned description, "How long file history and the recovery stash are kept."

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
- **No Leftovers (10-22-2026):** When making any decisions. Ensure you know that I don’t want any leftovers to be allowed to remain format when there’s clear ways for them to be flushed or tidied. That’s a constraint — if you’re making in-flight decisions during planning, assume I don’t want stale leftovers in peoples nexuses or leave things “clogged” when simply removing them is an option without additional cost and rides what’s already established codebase pattern
- **Try Again Unclogs (10-22-2026):** Anything where an error occurs, and a "Try Agin" option would retry it, it should be available. We shouldnt just report erros with the ActionLabel that cannot be "unclogged" if you get what I'm saying.
- **Unambiguous Reduction (10-22-2026):** I also need to make the intent clear that were unambigiously reducing how much stuff is wwithin the codebase. You should unarguabaly have an easier time adding more stuff, changing things, explaining it, and patching the codebase in the future from a brefore-and-after perspective.
- **Adding Code (10-23-2026):** "Why are we adding code?" … "Keep this concern in mind." Every line execution adds answers this question first: a phase, fix, fold, or call that grows the code shows what it removes or why no smaller shape delivers it, and a recommendation that adds lines says so plainly.
- **Reduction Floor (10-23-2026):** "Anything under 550 lines total removed raises concern for scope creep." The bar is the whole plan's measured net production delta: the written −495 sits 55 lines short of it, and the projected −469, with the rulings landed between Phases 7 and 8 (+26), 81 short, so the deferred folds and the post-plan fold carry the gap. Nathan, 10-23-2026: "the floor is light. Don't chase it if that would be stupid" — it's a soft signal weighed under No Negligent Sacrifices, and no cut is taken only to reach it.
- **No Negligent Sacrifices (10-23-2026):** "Also, don't maek negligent sacrifices JUST for less lines" — a reduction lands only when the code reads at least as clearly, keeps every behavior and ruling, and stays correct; *Reduction Floor* is met by folds that also improve the code, never by cramming, obscuring, or dropping something that earns its place.
- **One Rule, Not Cases (10-23-2026):** "That's the issue, you're hand-rolling it for every case." A behavior lands once, at the one point every path already passes through, and the guards or branches that produced the exceptions leave; a rule is never applied path by path, and a path that bypasses the shared point folds into it.

#### Rejected

- **No Crash-Recovery Notes:** dropping the notes would leave a change the app quit during split between old and new names, with nothing able to finish it.
- **Retiring the Stash:** leaving a removed property's values on the pages, hidden in that Collection, puts back the dormant foreign values Nathan ruled out in July (7-2 C-3).
- **Numbered Names for an Owed Delete's Key:** a new property reusing a deleted property's name while its cleanup is unfinished would sidestep the cleanup instead of finishing it (B-4).
- **Changing Sync's Merge Rules Here:** Sync is expected to be rebuilt, so a merge-rule change now would add rules to a design about to be replaced (H-1).
- **Moving Context Out of the Property Types:** Context stays a property type (F-1).

#### Prospects

- **Checkbox False on Uncheck:** a per-property choice for a Checkbox to write `false` when unchecked, in place of removing its key.
- **Option Approval:** a Multi-Select's unknown and externally-added words are scanned and offered to the user to approve or deny as options, in place of registering them on their own.
- **Sync Rebuild Inputs:** the merge losses this work found are recorded in *Properties Restructure — Planning Findings › §Sync Rebuild Inputs*. The scouts' candidate rules for the rebuild are a whole-on-absent rule for a property deleted on one side (08-01), per-option merging (`{defs: 3}`, 08 Approach B), per-property and per-page merging for the stash (03-02, 08-06), and front-matter merging key by key at sync landing (08 Approach D).

---

#### Sources

- `.claude/Planning/Properties Restructure/BRIEF.md`
- `.claude/Planning/7-2 - ViewPane Properties Flow — Decision Log.md` at `052ceec63` — C-3 and C-6, the stash's origin
- `.claude/Features/PropertiesPM.md`
- `.claude/IssuesPM.md` — I-006, I-032, I-035, I-036, I-039, I-042, I-063, I-064
- `~/NexusOS/.nexus/properties.json` — no type id an earlier build wrote
- `~/NexusOS/Studio/Athena/II. Drafts/Studio-Brainstorm-V2.md` — this log's template and confidence tags

---

### Session Questionnaire

#### Setup and Alignment

- **Q:** Do the ratified principles stand — Nathan's fifteen reconciled into ten, plus ten new entries, now the *§Perspectives*? **A:** Yes.
- **Q:** Does "the Properties system" mean property logic wherever it lives, including the crash-recovery and sweep machinery Contexts carry in parallel (I-036)? **A:** Yes.
- **Q:** Is the Archive work finished? Its plan reads Ratified with nothing ticked. **A:** It's done; "Ratified" was stale, "Complete" is the right status, and its implications are relevant.
- **Q:** Does any Nexus besides NexusOS, `~/Test`, and the Benchmark Nexuses need to keep reading? **A:** No.
- **Q:** Is there any property behavior you know you never asked for? **A:** Finding those is the purpose of the deepclean. A Multi-Select registering unknown and externally added words as options on its own is intended; scanning them for approval or denial is a prospect.
- **Q:** Does the session shape stand — decisions this session, execution in later sessions — along with the scout roster? **A:** Not answered; taken as proposed.
- **Q:** Was `~/Test` deleted on purpose? **A:** It was accidentally removed. **Q:** Rebuild it through a `test` preset in the benchmark generator? **A:** Yes.
- **Instruction:** Every explanation put to Nathan is in plain, non-technical English, with the technical evidence kept apart and complete.

#### Crash Recovery

- **Q:** Before a change that rewrites many files, Pommora writes one crash-recovery note, and there's room for only one at a time. Should every property get its own note, should there be no notes at all, and how should deletes and reused names behave? **A:** Unsure — he didn't understand what the note is or why the choices matter.
- **Q:** Re-explained through renaming Priority to Urgency: should every property, Context, and Space get its own note, or should there be none? **A:** One note each. Planning presents the file structure, which part owns which, how it works now, and the proposed revision.
- **Q:** Should every change that rewrites many files update the list first, then the files? **A:** Agreed.
- **Q:** Should a delete that can't reach every page finish what it can and offer Try Again, everywhere? **A:** Yes.
- **Q:** Should a new property reusing a deleted property's name, while that delete's cleanup is unfinished, take a numbered name such as "Name 2"? **A:** No — it shows an error with Try Again that gives the cleanup another run, using the general copy.

#### The Removed-Values Stash

- **Q:** In July you ruled that removing a property from a Collection takes its values off the pages and keeps them in the Collection's settings file. The Investigation recommended retiring that store and leaving the values on the pages. Which stands? **A:** Remove the value, but stash it within the Collection, or see if there are issues around that which keep the behavior intact. Planning raising a better placement for that store is encouraged.

#### Option Identity

- **Q:** Should every option get a permanent id, with NexusOS's views, tiles, and property list converted once? **A:** ID.
- **Q:** Should collapsed groups be remembered per property, converting NexusOS's existing ones? **A:** Correct.

#### Undo

- **Q:** Should undo be built from the file's own text, should it put back other properties' tidy-ups, and should it take back a Link value's alias? **A:** Unsure — he didn't understand.
- **Q:** Re-explained through a "Pomora" typo and a bare `Status:` key coming back as `Status: null`. **A:** "When you Undo we should be looking at the FILE, not the cell — how come it's done differently?"
- **Q:** Should undo put back only the edited property, leaving other properties' tidy-ups? **A:** Yes.
- **Q:** Should undoing a Link value also remove the alias it added? **A:** Yes.

#### What Counts as a Property

- **A (Volunteered):** Contexts can stay a property type; Created At and Modified At shouldn't — they can become "Filedata" or "Metadata". Investigate what may already exist placement-wise. They'd go under a similar category as Aliases or ID if possible.
- **Q:** Is Title, like the timestamps, not a property type? **A:** Yes, same with Icon.

#### Where Changes Reach

- **Q:** A Context change reaches loose pages while a property change reaches only Collections and the Archive; Spaces are found by scanning the disk while pages are found from memory; and a failed Space update during a restore is ignored. Which should each be? **A:** "Whatever makes sense. I don't understand why you're recommending things here. Pommora should use whatever scan is best for this; I don't know why properties and Spaces work differently here, but I'd assume they should take one shared mechanism unless there's evidence why that may not be smart."

#### Sync Conflicts

- **Q:** How should a property deleted on one device and edited on another resolve, along with two devices creating one name and two devices editing one page? **A:** Whatever choice fixes the issue without adding rules or making decisions about how Sync actually works; Sync is likely going to be taken down and rebuilt soon.

#### Style and Format

- **Q:** Should each layer of settings — the whole Nexus versus this view — get one word, with one Style row in the pane? **A:** One word per view.
- **Q:** Dates are formatted per view while numbers are formatted per property. Which way should they go? **A:** The format for a date column rides the property's own format, with per-column display overrides.
- **Q:** Number, Checkbox, Link, and Date each offer different settings that reach either the property everywhere or one view; which goes where? **A:** Link is correct as it is, and Date seems correct too. Number's Number or Bar look reads "Style" in a column's right-click menu, as the rest do. Link's default can stay, or ride the existing Default Link Format or a similar Nexus setting; otherwise it isn't actually an issue. Link's Underline and Color stay as they are, Number's settings stay as they are, Date stays as it is, and Checkbox stays as it is.

#### Value Surfaces

- **Q:** Should the table, cards, and panel match one another: the card's typed-path File field, the filter's date clock, spaces-only text, the Link label's right-click, unchecking a checkbox, the panel's added rows, the 80% zoom threshold, and the pen's spoken label? **A:** Cards and how they deal with files are intentional, so the card's typed-path field stays. Filters use the column's clock. Spaces-only text is empty. Keep the unchecking behavior; a per-property option for checkboxes to change that default is a prospect. A Link label's right-click gets Edit and Rename if it's genuinely the cohesive move. The panel's added empty row staying until it resets per page is intentional. The pen's spoken label reads "Open In Editor". The card's chip-remove behavior below 80% zoom is intentional.

#### View Edges

- **Q:** Should the view accidents be fixed: an unreadable filter value matching every page, a Checkbox's "is not empty" passing every page, empty values sorting by five rules, and deleting a grouped property forgetting collapsed folders? **A:** Fix, obviously.

#### Property Editors

- **Q:** Should every type's editor share one layout, and what about editor-row icons, the option popup's title field and footer, Decimals reading "Hidden", and a fraction denominator of zero? **A:** The Decimals picker's "Hidden" is intentional. The fraction-zero issue gets fixed. The Date editor's rows are intentional as they are; Date being the only editor whose rows carry icons gets fixed. The option popup's title field and footer are fine as-is, but planning raises where the discrepancy is. The spacing issues get fixed.

#### Display Defaults

- **Q:** Should unstyled date columns stay time-less, should a Select's compact chip use the Select type icon, and should user-made Status groups get their own glyph? **A:** Unstyled stays the time-less default. Keep Select's single tag icon. The user-made Status group glyph is intentional.

#### Small Things Saved to Disk

- **Q:** Should Status options stop storing their group's id, what should happen to the Trash's unread "partial" mark, and should deleting a property keep creating a Trash entry in system Trash mode? **A:** Remove Status options' group ids, stripping NexusOS once. The Trash's partial flag shows its partial declarations, and when a partial restoration happens it's shown to the user in one form or another. Keep creating a Trash entry for property deletes.

#### Confirmations and Wording

- **Q:** Deleting a property or option asks even when no page holds it, clearing asks past one page, and an option's "Remove" is permanent. How should confirmations count, and should the option's Remove read Delete? **A:** Deleting properties takes the same "none-before-one" as the Archive does, potentially as a new or reusable DRY opportunity. Clarified: in an appropriately moved location within the codebase, removing and clearing properties and options have their counts reflected properly, with the confirmation's counting and vocabulary correct. The option's "Delete" label — yes.
- **Q:** Should an editor whose property disappears return to the list, and should a damaged property list open the Nexus with Properties marked unreadable? **A:** Agreed.
- **Q:** Should Repair Properties On Open be on by default? **A:** Agreed.
- **Q:** Should Pommora tell the user when a create takes a numbered name? **A:** Yes.
- **Q:** Should the value picker create Status options? **A:** Planning approaches it with the most appropriate recommendation.

#### Edge Rules

- **Q:** Do the edge rules earlier agents chose stand? **A:** The rules seem right.
- **Q:** A Select or Status holding several words shows the last registered one. Does that stand? **A:** It ignores any unregistered values and tidies on the next change as previously established, while an added option, if it's a valid option, replaces the less recent one; this may or may not change existing behavior.
- **Q:** Select, Multi-Select, and Context picks handle unrecognized words differently. Does that stand? **A:** Current behavior is intended.

#### Inferences Recorded Without Objection

- The stash's and options' sync goals become inputs for the Sync rebuild unless placement or shape achieves them without a Sync rule; option ids land regardless.
- Empty values sort last for every type; drag-to-reassign in a sorted view stays.

#### Final Clarifications

- **Q:** A row added in the Properties panel stays shown, empty, across pages until the Nexus changes; keep it? **A:** Yes, and it's subject to cleanup like everything else. Adding the row may mean the user wants to add a property to it, so revoking it the moment it's empty would be the wrong call, but it should also be a blank row for every other page.
- **Q:** Clearing a property a page doesn't hold tidies the page's other properties, while on a Space it does nothing; should it do nothing on both? **A:** Tidy in both, unless planning finds meaningful simplification in making it neither.
- **Q:** Should the panel's right-click on a File value match the card's? **A:** Yes, and offer Remove. The whole right-click menu should be the same wherever it opens, table or card; take that with a grain of salt and look out for blatant divergence and consolidation opportunities.
- **Q:** Does "date-row being icon-only should be fixed" mean every editor's rows get icons? **A:** Every property's settings rows should get an icon as Date's do; it's out of scope here but definitely should be done, so it's filed as an Issue.
- **Q:** One Style row per type for a view's look? **A:** Keep that open and make no calls on how the settings panels are done; note it in the same Issue. Fix a setting that's genuinely confusing or genuinely in the wrong place, and leave "Date Format" and "Show Decimals" ambiguous in the rows' wording for a later pass.
- **Q:** A Select holding several words: does editing a different property on the page trim it? **A:** Yes; it tidies using the same logic as the rest.
- **Q:** What are Title, Created Time, Last Modified, and Location called as a group? **A:** Filedata.
- **Q:** Where does the stash live: the Collection's settings file, or its own small files in `.nexus`? **A:** The Collection's settings file, tied to the page history timeframe; note in the Issues index that it should likely get its own timeframe before cleanup.
