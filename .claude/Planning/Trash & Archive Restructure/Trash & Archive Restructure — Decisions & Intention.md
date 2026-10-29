### Trash & Archive Restructure — Decisions & Intention

**DATE:** 10-28-2026
**STATUS:** ACTIVE

### Context

Pommora keeps every departed item as a bundle: a stamped folder holding the item, its artifact, beside a `_record.json` saying where it belonged and what it carried. The Trash keeps deleted pages, Sets, Collections, Spaces, Contexts, and properties in `.trash`; each Collection's Archive keeps archived pages and Sets in `.nexus/archive/<Collection ID>`. What both stores share lives in `Core/Bundles/` (layout, bundle, record, placement, rows, browser, and the table both browsers draw); the Trash's operations live in `Core/Trash/` and the Archive's in `Core/Archive/`.

The two stores run different models. The Archive is reach-in: its pages are indexed and every cascade rewrites them as it rewrites live pages, so a restore is a plain move. The Trash is mostly resolve-on-restore: a trashed copy is frozen, and its restore re-spells keys and option words, drops Link values naming pages gone, repairs its own links, and refills what its delete stripped. Three paths already reach into trashed copies regardless: a permanently deleted property's strip, a restore's Link refill into trashed holders, and a property re-assign's stash refill. The Archive's own decisions built its reach so the Trash could later move onto it, and MetadataV3 recorded Indexed Trash as a prospect needing its own brainstorm.

### Overview

This work restructures the Trash, the Archive, and their adjacencies so the system reads as one design: what's duplicated or defined in parallel is consolidated, what's separate without earning it is merged, and what was patched on is replaced by the rule it was patching around. Whether the Trash moves onto the Archive's reach-in is decided by measurement and the investigation, not assumed. User-facing behavior stays as it is.

#### Concepts

- **Bundle:** a stamped folder in the Trash or an Archive holding one departed item, its artifact, beside its `_record.json`.
- **Store:** the Trash or one Collection's Archive; each holds bundles under the folder chain their items left from.
- **Reach-In:** a stored item stays inside every cascade while hidden from the app, so it's current whenever it returns and its restore is a move.
- **Resolve-on-Restore:** a stored item is frozen as it leaves and reconciled against the current Nexus as it returns.
- **Two-Wave and Neutral Review:** two rounds of paired reviewers (one reading inward, one outward against the codebase), each round folded before the next, then a reviewer given only the before, the after, and a plain statement of intent (*Info Buttons — Implementation Plan · §Final Verification*).

---

### Decisions

1. [CONFIRMED] Sync changes as little as possible; it's likely to be reworked substantially, and this work shouldn't bear on it. [INFERRED] A reach-in Trash rewriting trashed files through cascades, as the Archive's files already are, isn't a sync concern in itself.
2. [CONFIRMED] Link behavior stays as it is: deleting a page strips the Link values naming it from other pages' and Spaces' frontmatter; restoring it re-adds the values its delete stripped, and body links naming it resolve again.
3. [INFERRED] Restore Links On Deletion stays, since removing it would be feature-level.
4. [CONFIRMED] Before any approach is planned, a temporary, rudimentary reach-in build of the Trash is measured against today's code across a matrix of Nexus sizes, Trash sizes, and operations, for time and cost; the Trash's model rests on that measurement, and the build and its fixtures are removed afterward.
5. [CONFIRMED] Nothing in this work considers or accommodates any one user's own usage of the app or another application sharing the Nexus; every rule is stated generically.
6. [CONFIRMED] Architectural calls outside Nathan's familiarity, such as merging the two stores or the Archive's on-disk layout, are the investigation's and the plan's to make, presented with their reasoning.
7. [CONFIRMED] The surface is `Core/Trash`, `Core/Archive`, `Core/Bundles`, the owed-work finisher's Trash and Archive arms, the Archive-aware page lookups (`Core/Nexus/heldPages.ts`), the restore's and archive's re-spell (`Core/Nexus/settle.ts`), the saved views' gone-container edits (`Core/Nexus/configReach.ts`), the metadata drop on delete, and both browsers.
8. [INFERRED] The open issues in this surface — I-033, I-064, I-065, I-069, I-077, I-079, and I-080 — are in scope wherever the fix is clear.
9. [CONFIRMED] The Archive's planning documents were removed deliberately; completed plans that cite them aren't updated.
10. [CONFIRMED] The Archive keeps its layout: `.nexus/archive/<Collection ID>/` holds each item under the full path it left from, the Collection's own folder included, since that path is what links written before the archive still name, and dropping it would add a lookup at every reader and a migration while removing nothing (*Scout 4 — Filing & Store Shape*).
11. [CONFIRMED] Files the Trash takes without a bundle, such as a deleted tile's text or an image sweep's leftovers, stay invisible: no listing shows them and no reach reads them.
12. [CONFIRMED] Code kept only so records written by older builds still decode falls under the rule against compatibility code and leaves, such as a Context record's optional `at` (*Scout 1 — Delete & Record*). [INFERRED] A record that no longer decodes afterward drops out of the Trash's listing, and the plan states how existing records are handled.
13. [CONFIRMED] Claude's call, delegated by Nathan: every kind remembers its place among its siblings one way. An item leaves every order it sits in when it's deleted, and its record names the neighbors it returns between in each. A Context sits in two orders, the sidebar's (the registry's) and the Property Panel's Context order (`state.json`), so its record names its neighbors in both through the same rule; the registry index `at` and the panel id kept in `state.json` while it sits in the Trash both leave. [INFERRED] The order of a Context's own Spaces is its content, as a container's child order is, and returns with it.
14. [CONFIRMED] System Trash Mode leaves, with every branch only it reaches: a delete always mints a bundle in the Nexus's own Trash. Emptying the Trash still hands an item to the operating system's trash, or erases it under Permanently Delete Files.
15. [CONFIRMED] A Set or Collection emptied out of its store one item at a time stays as a restorable row, deliberately: it still holds configuration worth recovering, its schema, its nested Sets' settings, and any view saves those levels may carry later. I-077 closes as intended, and the reason sits where a reader meets the behavior.
16. [CONFIRMED] A Link value naming a title two pages of one trashed bundle share stays dropped: Pommora writes a link by the shortest path tail that names its page alone (`writtenName`, `Core/Connections/pageIndex.ts`), so such a value was already ambiguous before the delete. I-065 closes as intended.
17. [CONFIRMED] The Trash's and the Archive's tables keep their own looks. [INFERRED] Code they share still consolidates wherever what each draws stays the same.
18. [CONFIRMED] The plan carries every fold and fix that doesn't depend on the Trash's model, whatever the measurement shows; the Trash's move onto reach-in is decided on its own. "Less" is measured across its whole definition: mechanisms, files, types, branches, tests, and documentation as well as lines.
19. [CONFIRMED] The cascades' per-file write path joins this plan when its fix is a contained phase, or when the whole cleanup, that fix included, stays reasonably under six phases; otherwise it becomes its own plan. The write-path investigation makes that call.
20. [CONFIRMED] Under Decision 19, the write path becomes its own two-phase plan, run before this one: about 16 of its 17 files sit outside this surface, its fix would take the cleanup to seven or eight phases, and it carries a durability choice of its own. The flushed write that waits on the drive for every file is the largest single cost, 51-60% of a rename's wall time, beside a per-page index commit, repeated parses, and the watcher's directory rescans (*Write Path — Investigation*, *Reach-In Measurement*). The reach-in measurement is re-run on that plan's result before this plan decides the Trash's model.
21. [CONFIRMED] The write path keeps waiting for the drive to confirm each rewritten file is stored, and waits for files in groups rather than one at a time, so a crash or power loss mid-cascade can't leave a file empty or garbled.
22. [CONFIRMED] The work carries across sessions through *Write Path — Brief* (`.claude/Planning/Write Path/`): one session writes, ratifies, implements, and verifies the Write Path plan, re-runs the reach-in measurement on its result, and resumes this document's brainstorm from the brief's last section.
23. [CONFIRMED] The Write Path plan takes the whole fix, chosen so the write path needn't be revisited: every cascade reads and parses each file once, lands its writes in flushed groups, and records each group once, with every redundant read and parse removed. A confirmation's count stays its operation's own dry run, the one counter MetadataV3 established. The added lines are justified by what leaves, and offsets inside the files it touches are taken where they hold. Nathan approves the reviewed plan the night it's written, before it runs.
---

#### Constraints

- **Placement:** every placement of a new or moved file comes to Nathan for approval before it's written into the codebase.
- **Removal First:** any planning leads with what can be removed, consolidated, or replaced; this is cross-feature work with room to leave less in other areas, and nothing is added unless its absence would leave a real gap.
- **Sync:** nothing here makes decisions for, or materially impacts, future cross-device sync work.
- **Not Feature-Level:** nothing here is feature-level in the broadest sense.
- **Briefs:** Nathan's *Approach* and *Principles* (below, verbatim) govern every phase and task, and every agent brief on this topic — scouts, executors, and reviewers — carries both sections in full.
- **Models:** the Archive keeps its reach-in approach; the Trash keeps resolve-on-restore unless the investigation independently finds reach-in the more appropriate model for its restores, link cascades, and property updates. Any reach-in uses shared rulings and filters in place, and weighs its time and performance implications.
- **Shared Over Duplicated:** the Archive is the more recent design, so any behavior worth consolidating becomes shared rather than duplicated.
- **Process:** the brainstorm runs on the draft Studio-Brainstorm-V2 and planning on the draft Plan-Creation (`~/NexusOS/Studio/Athena/II. Drafts/`), the installed `studio-brainstorm` and `writing-plans` skills filling their gaps; the two-wave and neutral review runs before ratification and again over the implementation, as *MetadataV3 — Implementation Plan*, *Disclosable Bundles — Plan* (`.claude/Planning/Completed/`), and *Info Buttons — Implementation Plan* ran it.
- **The Measure:** the end result is concretely less — less duplication, cleaner distribution, fewer files where possible, more navigable systems — and a neutral before-and-after assessment given no context and nothing to look for prefers the after state every time.

**Approach (Nathan, verbatim):**

- Any approaches being considered here must first assess what’s true *now* that would be able to be removed, deleted, changed, consolidated, or replaced. We’re not going to design based on what’s currently there and simply adjust course, we’re ensuring totality-first application, removal-first scoping, and residue-eliminating frameworks that provide a clean slate rather than building changes on top of what’s ultimately going to be replaced.
- We’re approaching this through consolidation-first properties, ensuring the codebase ends up more understandable, less complex, more efficient in what it does, less conflicting in defining that, and an overall cleaner foundation to work within.
- We shouldn’t adding anything new unless there’s evidence that it’s required. We’d approach this through the perspective of ending up with cumulatively “less stuff” in the codebase overall — less ways to do similar things, less complexity, fewer paths to go through, less tech debt waiting to surface, less things to maintain, and less headaches when approaching future work entirely — while the line-count *may* end up positive. Net-negative lines are the north star, but any net-positive gain *must* have its rationale for that outcome be genuinely backed through this framework and our <principles>.
- Anything within our surface area should be left reading as always-intentional, without any odd-ones-out designs, and be reflective across the broader codebases' resulting shape — not just maintaining remnants or adherence to what’s true *now* that’s ultimately going to change. The approach should reflect the outcome and shouldn’t be bound to constraints that were only relevant before.
- Ensure we're looking *outward* for cross-file opportunities and shared design, avoiding hand-rolling or duplicating what's already there or can be adjusted accordingly. Pommora is an established codebase and we’re not starting from scratch.
- The complex data-level mechanics of the codebase are what least reflect *Nathan’s* intentions and are primarily reflective of what’s determined appropriate via past session agents. Treat it with care and respect, but don’t assume it’s beyond changing within reason, where simply presenting the approach to Nathan may be all that’s required to genuinely change the codebase for the betterment of everything within it and future iterations.

**Principles (Nathan, verbatim):**

- **Less to Carry:** No more functions, helpers, wrappers, types, layers, and call sites than necessary, and no logic stated twice. New code earns its place by removing more than it adds, fixing incorrect behavior, or delivering required behavior in its minimal form.
- **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before, whether a developer reading code or Nathan reading file names and headers. A blind-eye review of the surface areas impacted by this implementation should find less confusion, less conflict about intent, and an unambiguously more approachable, maintainable ecosystem to iterate on. 
- **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go, with no choice between layers, helpers, or modules — nothing that exists somewhere where it shouldn't; nothing implemented where something else already does it or adjusting it accordingly would be the more appropriate approach; nothing that increases the risk of misassumption when working here in the future.
- **Reads as Designed:** Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains. Nothing designed around codebase shapes that will ultimately be changed for the better.
- **One Way:** Each thing has one implementation, one pattern, and one source of truth. No part contradicts another. Exceptions carry their reason where a reader meets them, in code or feature documentation.
- **Real Purpose:** Anything added to the codebase should have its purpose clearly stated with the perspective of its value enhancing what's already there — complexity, duplications, divergences, multiple ways to do the same thing — and anything "new" added should be assessed using that. Line-count increases shouldn't translate into maintenance cost or complexity.
- Anything introduced should have independent justification behind its existence that isn't simply self-induced requirements. 
- Anything changed or implemented should be reflected across the board — nothing that's done this way here, while something else works differently elsewhere, unless that's *genuinely* correct.
- Zero data-level spaghetti, complexity, or additional 'stuff' should be added without reason. Rewiring things to become more understandable, more efficient, more appropriate, and more effective is preferred when the alternative is just adding more to something that's inherently unfit to suit the long-term mandate of what's actually being offered.

#### Rejected

- **Archive-Style Link Values in the Trash:** a trashed page's Link values staying in place, unresolved, until the Trash is emptied; a delete keeps stripping them (2).
- **One Path Level Under an Archive's ID Folder:** dropping the Collection's own folder beneath its ID folder; it removes nothing and costs a lookup at every reader of an origin path, a mismatch with links written before a Collection rename, and a migration of every Archive (10).

#### Open Items


#### Prospects

---

#### Sources

