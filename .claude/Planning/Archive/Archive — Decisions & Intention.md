### Archive — Decisions & Intention

**DATE:** 10-19-2026
**STATUS:** ACTIVE

### Context

Pommora keeps a user's content in a folder called the Nexus. Pages are Markdown files inside Collections, which are folders carrying a shared set of properties, and Sets, which are folders nested inside a Collection. The app reads the Nexus once into the **tree**, its in-memory picture of everything a user can see and navigate. When something changes that many files depend on, such as a property's rename, an option's removal, or a page's new title, Pommora rewrites every affected file in one pass, called a **cascade**. Folders whose names start with `.` or `_` are hidden: the tree, the index, every cascade, the file watcher, and sync all skip them (`Core/Paths/exclusion.ts`).

Removing a page today has one path, the Trash. A delete moves the page into a bundle under `.trash/` with a `_record.json` naming where it lived, and strips the Link property values that pointed at it from other pages. While it sits in the Trash, no cascade reaches it, so a restore has to bring it up to date as it lands: it re-spells its property keys into their current formats, scrubs properties that no longer exist, repairs its links, and refills the Link values the delete stripped (`Core/Trash/spend.ts`, `restoreScrub.ts`). The Trash browser lives in the Settings window as a searchable list with checkboxes for batch Restore and Delete (`Core/Settings/TrashFrame.tsx`). *Archive — Investigation* holds the verified state of the code at `213f95a3b`.

### Overview

The Archive gives each Collection a place to put pages and Sets that are finished with but not deleted. An archived item leaves the tree, so it disappears from navigation, views, search, link suggestions, and the Matrix, and links pointing at it read as unresolved. Unlike a trashed page, it stays inside every cascade: renaming a property, deleting an option, or renaming a page it links to rewrites the archived file just as it rewrites a live one. Restoring is therefore a plain move back to where it came from, into its exact place in the list, with nothing to reconcile. The files sit in a hidden folder, `.nexus/archive/<Collection ID>/`, which is the single exception to the hidden-folder rule: cascades, the index, the watcher, and sync admit it, while the tree and every discovery surface still leave it out.

Each Collection, and each top-level Set, gets an ArchiveView reached from an Archive button in its views menu: a table of Title, where the item lived, and when it was archived, with checkboxes for batch Restore and Delete by right-click or through a new action bar, ActionLabel. An archived page opens in a read-only reader window built from the File History window, marked with a lock glyph. Every menu that can delete a page or Set gains Archive directly above Delete. Archiving asks first under its own setting and always offers Undo, archived pages' history can be trimmed sooner than live pages', and the Trash shares the Archive's placement, its exact-position restore, and its rule for excluded folders.

#### Concepts

- **The Tree:** the app's in-memory picture of the Nexus, which everything a user sees and searches reads from.
- **Cascade:** one pass rewriting every file a change affects, such as removing a deleted property's values or re-spelling links to a renamed page.
- **Reach:** the set of files a cascade opens and may rewrite.
- **Archive:** a Collection's store of archived pages and Sets, outside the tree and inside every cascade's reach.
- **Archiving:** moving a page or Set out of its Collection or Set into its Collection's Archive. Only what lives inside a Collection can be archived; Collections, Contexts, Spaces, and properties can't.
- **Reach-In:** cascades rewriting archived files as they rewrite live ones, so a restore has nothing to reconcile.
- **Reconcile-on-Restore:** the Trash's model, where a returning page is brought up to date as it lands.
- **Origin Record:** what the Archive keeps about an archived item: its kind, where it came from, its place in that list, and when it was archived.
- **ArchiveView:** the table listing a Collection's or Set's archived items.
- **ActionLabel:** the action bar in the window's top-right label position offering Restore and Delete for the checked rows.
- **Reader Window:** the one read-only page window, generalized from the File History window, that File History and the Archive share.
- **The Lift:** leaving an excluded folder behind in its parent when the Set or Collection around it is archived or trashed.
- **Orphaned Archive:** an Archive whose Collection exists nowhere: not live, not in the Trash, and not under an excluded folder.

---

### Decisions

#### A - Scope

- **A-1 [CONFIRMED]:** Each Collection should gain an Archive that holds pages and Sets outside the Trash and outside every surface but that Collection's ArchiveView.
- **A-2 [CONFIRMED]:** The Archive should hold pages and Sets; an archived Set carries its pages and nested Sets with it. Only what lives inside a Collection is archived: Collections, Contexts, Spaces, properties, and folders outside every Collection aren't.
- **A-3 [CONFIRMED]:** This effort builds the Archive, archiving and restoring, and whatever that requires. The Trash's look stays untouched and its model stays Reconcile-on-Restore; its data layer and backend may be restructured where sharing with the Archive calls for it. The shared reach is designed so the Trash could later move onto it (*§Prospects · Indexed Trash*).
- **A-4 [CONFIRMED]:** The Archive's code should live in its own Core domain, `Core/Archive/` or a name the plan finds fits better, while what the Trash and the Archive share lives in one neutral owner beside them.

#### B - Location and Storage

- **B-1 [CONFIRMED]:** The Archive should live in a hidden folder that is the one and only named exception to the hidden-folder rule: every cascade reaches into it, and the index, the watcher, and sync admit it, while the tree and every discovery surface leave it out.
  - **[CONFIRMED]** A hidden folder inside an archived Set stays ignored, as inside a live Set: the exception admits the Archive's own folder, not hidden folders within it.
  - **Example:** a Collection `Alpha`, whose id is `01J…`, holds a Set `Beta`, and `Beta` holds a page `Notes.md` and a hidden folder `_raw/`. Archiving `Beta` moves `Beta`, `Notes.md`, and `_raw/` into `.nexus/archive/01J…/`. From then on the sidebar, views, search, and link suggestions no longer show `Beta` or `Notes`, since the tree leaves the Archive out. A property rename that sweeps `Alpha` still rewrites `Notes.md` inside the Archive, since cascades reach into it. Sync carries the move to other devices as a move, so they hold the same Archive. `_raw/` stays ignored inside the Archive, as it was inside `Beta`. Restoring `Beta` moves it back to `Alpha/Beta/`, in its old place in `Alpha`'s order (E-2).
- **B-2 [CONFIRMED]:** Each Collection's Archive should sit at `.nexus/archive/<Collection ID>/`, filed by the Collection's id. `.nexus` is the app's own folder and isn't meant to be legible, so id-named folders inside it don't strain the Legibility decision, and an Archive left without its Collection is handled by F-5. The location sits behind one resolver every consumer asks, so it stays easy to change.
  - **[INFERRED]** A Collection-scoped cascade finds the Archive from the Collection's id, which its folder already gives it.
  - **[CONFIRMED]** The location isn't recorded in `_pagecollection.json`: it derives from the id, and a stored copy would be a second source of truth with nothing to choose between them.
  - **Example:** renaming `Alpha` from B-1's example to `Projects` changes nothing under `.nexus/archive/01J…/`, since the folder is filed by `Alpha`'s id rather than its name, and `Projects`' ArchiveView still lists `Beta`. Sending `Alpha` to the Trash leaves `.nexus/archive/01J…/` where it is, and restoring `Alpha` reconnects it by the same id (F-4).
- **B-3 [CONFIRMED]:** An archived page's `.nexus/metadata` entry (its icon, aliases, and title-icon override) should stay untouched while it's archived, so it returns intact.
- **B-4 [CONFIRMED]:** Each archived item's archived time should be recorded, which is all a later auto-delete would need.

#### C - Reach-In

- **C-1 [CONFIRMED]:** Archived pages should stay inside the mutation chain: property deletions, value clears, renames, option and format changes, Context and Space cascades, and link rewrites reach them as they reach live pages, so a restore returns a page that's already current.
- **C-2 [INFERRED]:** A cascade that removes something should remove it from archived pages too: deleting a page that a live or an archived page names in a Link value strips that value from both.
- **C-3 [INFERRED]:** Reach should come from two named reaches and one by-id map in place of today's five separately defined families, each including the Archive: a governed reach scoped to Collections, since a property key means something only where a schema governs it; a content reach across the whole Nexus, since a link or `<Context>` key is Pommora syntax wherever it's written; and a by-id map spanning the tree and the Archive for every refill. Configuration reach stays its own, as it rewrites configuration rather than pages. The delete's Link strip runs on governed reach, which C-2 needs.
- **C-4 [CONFIRMED]:** Confirmations and counts should name only items outside the Archive, while the operation they confirm also sweeps archived ones: removing a value from five live pages and two archived pages counts five. The one count producer behind every confirmation (`sweepCount`, `Core/Properties/governedSweep.ts:113-114`) leaves archived files out. The counts' copy reads "Items" and counts Space sidecars today (`Core/Interface/Confirm/confirmations.ts:107-118`), which stays.

#### D - Links and Discovery

- **D-1 [CONFIRMED]:** Links pointing at an archived page should read unresolved while it's archived. Link property values naming it should stay in place and resolve again on its restore, and an archived page's own links should count as no backlink and no Matrix edge.
  - **[INFERRED]** A link naming an archived page by title alone resolves to another page holding that title while the original is archived, since resolution reads only the tree. Path links naming it re-spell to where it lands on restore, as a move's do.
  - **[CONFIRMED]** Title-only links that landed on a namesake while the page was archived stay with the namesake when it returns.
- **D-2 [CONFIRMED]:** Archived items should be undiscoverable everywhere outside ArchiveView, including search, connection suggestions, navigation, views, embeds, and the Matrix.

#### E - Restore

- **E-1 [CONFIRMED]:** A restore should return an item to the Collection or Set it was archived from, resolved by id against the current tree after renames and moves. The Trash's placement logic is the starting point, reused, hoisted and shared, or reworked as the plan finds it.
- **E-2 [CONFIRMED]:** A restored item should return to its exact place in its Collection's or Set's order, and the Trash's restore should inherit the same: one shared placement, reached through the highest-level fold of what already orders pages rather than a mechanism beside it.
- **E-3 [CONFIRMED]:** An item deleted from the Archive and later restored from the Trash should return to the Collection or Set it was archived from, not to the Archive.
- **E-4 [CONFIRMED]:** A restore landing on a taken name should step aside to `Name (2)` through the one naming rule, its notice naming the title it took, and should ask the disk as well as the tree, so an excluded folder or an outside file in the way is stepped around rather than refused, as today's landing check (`Core/Nexus/folderEntity.ts:20-28`) and `exists` refusal (`Core/Trash/spend.ts:181-182`) refuse them; the disk-asking rule is `createDisambiguated` (`Core/Paths/names.ts:66`). This holds for the Trash's restore and the Archive's alike.
  - **[CONFIRMED]** A "Resolve Restoration Conflicts" setting (Preserve Existing Titles | Preserve Restored Titles) is wanted later and is recorded as F-080 in *IssuesPM*; the plan folds it in only if it proves natural to.
- **E-5 [INFERRED]:** An item archived out of a Set that's since been trashed finds that Set again by id once the Set is restored; restored first, it finds no parent and asks for a destination.

#### F - Collections, Exclusion, and Orphans

- **F-1 [CONFIRMED]:** Excluding a folder needs nothing new from the Archive: nothing inside an excluded folder can be archived, since it's outside the tree, and items archived before their Set or Collection was excluded stay in the Archive, inert in the interface. A restore whose origin has since been excluded finds no parent and asks for a destination, as the Trash's does.
  - **[INFERRED]** Clear Exclusion Cache deletes an excluded Collection's sidecar and with it the id its Archive is filed under (`Core/Settings/exclusionScan.ts:31-95`), so from then on that Archive is orphaned and F-5 moves its items into the Trash, recoverable.
- **F-2 [CONFIRMED]:** Archiving a Set should leave every excluded folder inside it behind, as if the Set around it had been removed: the excluded folder takes the Set's place in the Set's parent, its excluded entry following it, and it stays there when the Set is restored. Excluded content never enters the Archive, and the Archive records nothing about it.
  - **Example:** `Alpha` is a Collection or Set holding a Set `Beta`, and inside `Beta` sits a folder `Omega` listed in Settings › Exclusions, so Pommora ignores it. Archiving `Beta` first moves `Omega` up into `Alpha`, where `Beta` was, and rewrites its exclusion entry to `Alpha/Omega`, so it stays excluded; then `Beta` and everything Pommora manages in it move into the Archive. `Alpha` now holds `Omega` and no `Beta`. Restoring `Beta` brings it back as `Alpha/Beta` without `Omega`, which stays at `Alpha/Omega`.
  - **[INFERRED]** An excluded folder deeper inside the archived Set, as `Omega` in `Alpha/Beta/Gamma/Omega`, also lands in the archived Set's parent (`Alpha/Omega`), since `Gamma` leaves with `Beta`.
  - **[INFERRED]** Excluded folders count toward no title: Pommora's sibling-name rule reads only the tree, so an excluded `Omega/` sits beside a page titled `Omega` untouched. Only two folders sharing a name in one parent collide, since the disk holds one folder per name (case-insensitively on macOS); there the lifted folder steps aside to `Omega (2)`, and a restore landing where an excluded folder sits steps aside the same way (E-4).
- **F-3 [CONFIRMED]:** The Trash should follow F-2's rule through the same shared logic: a Set or Collection sent to the Trash leaves its excluded folders behind in its parent, a Collection's landing at the Nexus root. The folders' new locations ride one clean chain, either the existing one that rewrites an excluded entry when its folder moves (`followExcludedFolders`, `Core/Settings/settings.ts:97-106`) or a clean replacement of it, and the Trash's own bookkeeping for excluded folders leaves: the record's `excluded` entries and `releaseExcludedFolders`/`reseatExcludedFolders` (`settings.ts:118-127`). F-007 leaves with them.
  - **[CONFIRMED]** This holds for a delete straight to the system trash as well, and emptying the Trash never deletes excluded content: Pommora doesn't destroy what it's told to leave alone.
- **F-4 [CONFIRMED]:** A Collection's Archive should stay at `.nexus/archive/<Collection ID>/` while the Collection sits in the Trash and come back with it when the Collection is restored. Emptying the Collection from the Trash, or deleting it straight to the system trash, empties its Archive with it, wherever Trash Mode sends deletions.
- **F-5 [CONFIRMED]:** An Orphaned Archive should have its items moved into the Trash at the next open, where Trash Mode and Permanently Delete Files apply as to any deletion, so a Collection whose sidecar is only briefly unreadable loses nothing. No setting governs it.

#### G - ArchiveView

- **G-1 [CONFIRMED]:** ArchiveView should be a table with Title and Archived columns, the Archived column's right-click style menu following the Nexus's date format by default, and left-side checkboxes for batch Restore and Delete. It should look identical to the standard `TableView`, with full-length column dividers. What it shares with the Trash browser is shared beneath the visual layer; the Trash's look stays as it is.
- **G-2 [CONFIRMED]:** Each row should show where the item lived beneath its title, as the Trash's rows do.
- **G-3 [CONFIRMED]:** ArchiveView's header should show its Collection's or Set's title as its in-line title, with "Archive" as a trailing label in `label-tertiary`, and ViewSearch's clear button should pad against that label.
- **G-4 [CONFIRMED]:** ArchiveView should be entered from an "Archive" button in the views dropdown's footing, to the right of its New View `+`: inline-sized and filled, highlighted while ArchiveView is in view, and toggling between the view and ArchiveView.
  - **[CONFIRMED]** A top-level Set's views dropdown carries the button too, opening an ArchiveView of what was archived from within that Set.
  - **[INFERRED]** The Collection's ArchiveView lists everything archived from anywhere in the Collection, Sets included; the store stays one per Collection, and a Set's ArchiveView is that store narrowed by origin.
- **G-5 [CONFIRMED]:** ArchiveView should be remembered like any place in the content pane, through Back and Forward and a tab reopened after relaunch; only the reader window is forgotten.
- **G-6 [CONFIRMED]:** Batch actions should come two ways: the right-click menu on checked rows, as the Trash has, and ActionLabel reading `[Restore | N Pages  (trash icon)]` while rows are checked, its count phrased as the Trash's batches phrase theirs ("3 pages", "2 sets", "5 items" for a mix), Restore tinted and the trash destructive, either press posting the Undo notice. ActionLabel reuses the existing hover and reveal primitives rather than hand-rolling them.
- **G-7 [CONFIRMED]:** ActionLabel should be its own component, separate from the notification label, as the long-term owner of action points in that position.

#### H - The Reader Window

- **H-1 [CONFIRMED]:** An archived page should open in a read-only reader window that is single-state, uncached, and unremembered, with the lock glyph in the toolbar's leading slot where the open-fullscreen glyph sits. It's built from the File History window's shape as one shared read-only window, not as a mode of `PageWindow`.
  - **[CONFIRMED]** The lock glyph means read-only, one meaning shared with the File History window and the planned Page Lock.
  - **[INFERRED]** The File History window, as the same reader window, shows the lock glyph in its leading slot too.

#### I - Menus, Confirmation, and Undo

- **I-1 [CONFIRMED]:** Every menu that can delete a page or Set should end in one divided section holding Archive above Delete. Every page menu's Delete is one shared row run by one runner (`Core/Actions/pageMenu.ts:40`, `Core/Interface/Menus/pageMenuActions.ts:66`), so Archive is added once; a Set's Delete moves out of its `[Rename, Delete]` group into that section (`Core/Actions/entityMenu.ts:58-80`).
  - **[CONFIRMED]** A Collection's menu, which shares the container branch with Sets, moves its Delete into the same bottom section alone, since a Collection can't be archived.
- **I-2 [CONFIRMED]:** Settings › Files & Links › Deletion should be renamed "Trash & Archive" and gain "Confirm Before Archiving", on by default. The Trash frame at the foot of the Settings rail stays the Trash's alone.
  - **[CONFIRMED]** "Confirm Before Archiving" governs pages and Sets alike, though deleting a Set always asks, since archiving is undoable and removes nothing.
- **I-3 [CONFIRMED]:** Archiving should post the Undo notice with its countdown whatever the confirmation setting.

#### J - File History

- **J-1 [CONFIRMED]:** A Nexus-level history timeframe for archived pages should be part of the core scope, so later additions build on it rather than patching around it.
  - **[CONFIRMED]** Its row offers the History Timeframe's own steps and starts at the History Timeframe's value. Steps longer than the active History Timeframe show dimmed, and shortening the History Timeframe below it switches the archive timeframe down to match. The settings picker has no dimmed option today (`UIX/Pickers/PickerControl.tsx:10-14`), so the row needs one.
  - **[ASSUMED]** Until a step is picked, the archive timeframe follows the History Timeframe, as the Trash's date column follows the Nexus's Date Format while unset; once picked, lengthening the History Timeframe leaves it where it is.

#### K - Ride-Alongs

- **K-1 [CONFIRMED]:** Carrying an excluded entry with its folder should be crash-safe: the destination entry is written before the folder moves and the source entry dropped after, so a crash never leaves the folder un-excluded. Today the entry follows only after the move (`Core/Settings/settings.ts:97-106`, `Core/Nexus/folderEntity.ts:30-32`), which every Set rename and move shares.
- **K-2 [CONFIRMED]:** The two whole-index reads the interface asks for should return only what the tree holds: the Matrix graph (`Core/Matrix/matrixGraph.ts:19-43`) and every page's headings (`Core/Nexus/handlers.ts:166-168`). A Collection's value load should read the tree's pages under it rather than every file in its folder (`Core/Views/loadValues.ts:8-18`).
- **K-3 [CONFIRMED]:** A notice posted with the pointer already near it should stay unarmed until the pointer leaves once, so its countdown doesn't stall (`Core/Interface/Notifications/NotificationLabel.tsx:33-74`).
- **K-4 [CONFIRMED]:** One Restore and Delete menu builder should serve the Trash, File History, and the Archive (`Core/Actions/trashMenu.ts`, `fileHistoryMenu.ts`).
- **K-5 [CONFIRMED]:** Comments and copy already false should read true: `NON_CORPUS_TOP`'s comment (`Core/Paths/nexusPaths.ts:7`), `Core/Actions/destinationTree.ts:1`, `Core/Nexus/mutateRequest.ts:88`, and the Permanently Delete Files hint (`Core/Settings/frames.ts:595`).

---

#### Constraints

This section is copied verbatim into every planning document for this work.

##### Who Carries These

- Nathan's approach, principles, and constraints below are the core philosophy of the planning session and of every agent sent in planning and execution: scouts, executors, and reviewers each carry all three sections in full, word for word, in their briefs.
- The neutral verifier alone receives none of them. It's given only the baseline commit, HEAD, and a plain statement of what the work intended, and its unprimed read is the input against which the work's adherence to them is judged.

##### Approach

Nathan's, verbatim, with one word corrected: *Look Outward* named Sapphire, carried over from an earlier brief, where this codebase is Pommora.

- **Removal First:** any approach first assesses what's true *now* that could be removed, deleted, changed, consolidated, or replaced. The design isn't based on what's currently there with its course adjusted; it ensures totality-first application, removal-first scoping, and residue-eliminating frameworks that provide a clean slate rather than building changes on top of what's ultimately going to be replaced.
- **Consolidation First:** the codebase ends up more understandable, less complex, more efficient in what it does, less conflicting in defining that, and an overall cleaner foundation to work within.
- **Less Stuff:** nothing new is added unless there's evidence it's required. The work ends with cumulatively less in the codebase overall — fewer ways to do similar things, less complexity, fewer paths to go through, less tech debt waiting to surface, fewer things to maintain, and fewer headaches in future work — while the line count *may* end up positive. Net-negative lines are the north star, and any net-positive gain has its rationale genuinely backed by this framework and the principles below.
- **Always Intentional:** anything within the surface area reads as always-intentional, without odd-ones-out designs, and reflects the broader codebase's resulting shape rather than remnants of, or adherence to, what's true now and is ultimately going to change. The approach reflects the outcome and isn't bound by constraints that were only relevant before.
- **Look Outward:** look for cross-file opportunities and shared design, avoiding hand-rolling or duplicating what's already there or can be adjusted to fit. Pommora is an established codebase, and this work doesn't start from scratch.
- **The Data Layer:** the complex data-level mechanics least reflect Nathan's intentions and mostly reflect what past session agents judged appropriate. Treat them with care and respect, without assuming they're beyond reasonable change; presenting an approach to Nathan may be all it takes to change the codebase for the betterment of everything in it and of future iterations.

##### Principles

Nathan's, verbatim.

- **Less to Carry:** No more functions, helpers, wrappers, types, layers, and call sites than necessary, and no logic stated twice. New code earns its place by removing more than it adds, fixing incorrect behavior, or delivering required behavior in its minimal form.
- **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before, whether a developer reading code or Nathan reading file names and headers. A blind-eye review of the surface areas impacted by this implementation should find less confusion, less conflict about intent, and an unambiguously more approachable, maintainable ecosystem to iterate on.
- **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go, with no choice between layers, helpers, or modules — nothing that exists somewhere where it shouldn't; nothing implemented where something else already does it or adjusting it accordingly would be the more appropriate approach; nothing that increases the risk of misassumption when working here in the future.
- **Reads as Designed:** Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains. Nothing designed around codebase shapes that will ultimately be changed for the better.
- **One Way:** Each thing has one implementation, one pattern, and one source of truth. No part contradicts another. Exceptions carry their reason where a reader meets them, in code or feature documentation.
- **Real Purpose:** Anything added to the codebase should have its purpose clearly stated with the perspective of its value enhancing what's already there — complexity, duplications, divergences, multiple ways to do the same thing — and anything "new" added should be assessed using that. Line-count increases shouldn't translate into maintenance cost or complexity.
- Anything introduced should have independent justification behind its existence that isn't simply self-induced requirements.
- Anything changed or implemented should be reflected across the board — nothing that's done this way here, while something else works differently elsewhere, unless that's *genuinely* correct.
- Zero data-level spaghetti, complexity, or additional 'stuff' should be added without reason. Rewiring things to become more understandable, more efficient, more appropriate, and more effective is preferred when the alternative is just adding more to something that's inherently unfit to suit the long-term mandate of what's actually being offered.

##### Nathan's Constraints

Nathan's, verbatim.

- Because of how much trash and archive would share UIX and interaction between them, we *must* approach this through removal-and-unification perspectives *first* so that we're consolidating what's now shared and can be appropriately DRY-hoisted within shared components rather than existing as duplicates. The shared UIX within both views is an obvious example of this.
- Nathan's approach and principles govern every phase and task, and every agent brief on this topic — scouts, executors, and reviewers — carries both sections in full.

##### Working Rules

- **Re-Verify, Then Reuse:** *Archive — Investigation* and *Archive — Scout Findings* are leads verified at `213f95a3b`. A planning session re-verifies every claim it leans on against its own HEAD, and on the data layer and the Trash it rides the mechanism that already does the job before designing anything new.
- **Intent Over Wording:** the decisions record intent. INFERRED and ASSUMED entries are readings the plan confirms against the code or puts to Nathan before building on them.
- **Cost:** nothing the Archive adds runs on a high-frequency trigger. Archived files cost a read only when a cascade's candidates name them, and the orphan check and the history sweep run once at open.
- **Gates:** `npm run typecheck`, `npm run test`, and `npm run lint` from the repo root; `.claude/Guidelines/Development-Environment.md` before driving the app; `~/Test` for live testing.
- **Process:** planning runs on `~/NexusOS/Studio/Athena/II. Drafts/Plan-Creation.md`. Its blank sections take the installed `writing-plans` skill's guidance, and the processes it names without spelling out, such as Neutral Verification, take the shape of the completed MetadataV3 and Path Links plans; the draft wins where they conflict.

#### Rejected

- **Reconcile-on-Restore for the Archive:** archived pages sitting outside every cascade and caught up as they return, as the Trash does. Reach-In makes restore a move and needs no reconcile (C-1).
- **Archived Pages Kept in the Tree Under a Hidden Flag:** every cascade would reach them for free, but every discovery surface would need its own filter; leaving the tree hides them everywhere at once (D-2).
- **A Visible Archive Folder:** `<Collection>/Archive/` marked by its own sidecar, which every cascade and sync would reach with no exception; it puts archived pages in Finder and Obsidian, and B-1 keeps them hidden.
- **`_archive`:** hidden from the app by the same rule as `.archive` while visible in Finder and Obsidian.
- **A Per-Collection `.archive/`, and the `.collection/` Folder With It:** an Archive inside each Collection's folder, which would follow its Collection through rename, Trash, and Finder copies by path and can't be orphaned, with `.collection/` holding the Collection's sidecar and Archive in place of the root `_pagecollection.json` (`.index/` was floated as its name, which would read as the disposable content index). `.collection/` would move every Collection sidecar, likely Sets' and the Agenda's for consistency, and the orphan handling `.nexus/archive/` needs is small (B-2, F-5).
- **Moving a Collection's Archive Into Its Trash Bundle:** the delete and restore would each move the Archive, and it would sit out of reach while its Collection is trashed (F-4).
- **Excluded Folders Ridden Into the Archive, Set at the Nexus Root, or Banned Inside Collections:** carrying an excluded folder in with its Set under an entry made valid inside `.nexus`, setting it at the Nexus root and returning without it, and allowing exclusion only outside Collections; F-2 leaves it in the Set's parent instead.
- **A Restore-Time Prompt for Name Conflicts:** asking which side to rename on each restore; it interrupts batch restores and makes restore the one naming step that asks (E-4).
- **`TableView` in a Read-Only Mode:** `TableView` is built around live views and editing throughout and has no read-only seam (G-1).
- **The Archive as a Saved View:** a pseudo-view would write browsing state into the synced sidecar and skip Back and Forward (G-5).
- **A Mode of `PageWindow`:** its tabs, warm cache, and remembered tab set are what the reader window must not have (H-1).

#### Open Items

1. **The Origin Record (left to planning):** how an archived item's record is shaped and stored. It carries the item's kind, its origin's id (E-1), its archived time (B-4), its exact place in its origin's order (E-2), its origin path at archive time, so path links re-spell to where it lands (D-1), and enough of its origin's ancestry for a top-level Set's ArchiveView to list what was archived from anywhere within it (G-4). *Archive — Investigation* recommends one Trash-style bundle per item, flat under the Collection's Archive, in the Trash's record format.
2. **Confirmation Copy:** the words of "Confirm Before Archiving"'s dialog and of any new refusal or notice, set at the plan's review.

#### Prospects

- **Indexed Trash:** the Trash moving onto the Archive's Reach-In, which would delete the restore reconcile (`restoreScrub.ts`, the re-spell, and the link repair) and leave one model for hidden pages. A trashed page would stay *gone*, its Link values stripped at delete and refilled on restore, while its own contents stay current.
- **Auto-Delete:** a Nexus-level "delete after" setting, Never by default and ranging from about 30 days to a year, that moves archived items to wherever Trash Mode sends deletions once they've been archived that long.
- **Read-Only Properties in the Reader Window:** the window showing an archived page's Spaces and properties read-only. `PropertyPanel` has no read-only mode, so it would need one.
- **Resolve Restoration Conflicts:** the setting recorded as F-080 in *IssuesPM* (E-4).

---

#### Sources

- `.claude/Planning/Archive/Archive — Investigation.md`: the five scouts reconciled against the code at `213f95a3b`, with the verified state, the removal inventory, the reusable mechanisms, and the approaches.
- `.claude/Planning/Archive/Archive — Scout Findings.md`: the five scouts' cleaned reports (cascade reach; index, discovery, and location; the Trash's machinery; views, the table, and menus; windows, history, and settings).
- `.claude/IssuesPM.md`: F-007 (closed by F-3) and F-080 (E-4).
- `~/NexusOS/Studio/Athena/II. Drafts/Studio-Brainstorm-V2.md`, `Plan-Creation.md`: the drafted processes this brainstorm and its planning run on.
- `.claude/Planning/Completed/MetadataV3/MetadataV3 — Decisions & Intention.md`: *§Prospects · Indexed Trash* and *§Rejected · Sweeping Into the Trash*.
- `~/The Studio/Projects/Sapphire/.claude/Planning/Property Labels/Property Labels — Decisions & Intention.md`, `.claude/Planning/Completed/MetadataV3/MetadataV3 — Brief.md`, `MetadataV3 — Implementation Plan.md`: the precedent for this document's shape and the neutral gate.
- `.claude/Features/CorePM.md`: *§Folder Exclusion*, *§Mutations*, *§The Device-Local Database*, *§File History*.
- `.claude/Features/ConfigurationPM.md`: Files & Links › Deletion, the Trash frame, and the History settings.
- `Core/Trash/`: the bundle and record, the delete, the restore's placement and reconcile, and the listing.
- `Core/Paths/exclusion.ts`, `Core/Paths/nexusPaths.ts`, `Core/Files/walk.ts`: the hidden-folder rule, the corpus, and what syncs.
- `Core/Properties/keyHolders.ts`, `Core/Nexus/cascade.ts`, `Core/Contexts/contextCascade.ts`: today's reaches.
- `Core/Settings/TrashFrame.tsx`, `Core/Settings/frames.ts`, `Core/Settings/settings.ts`: the Trash browser, the Deletion section, and excluded-entry carrying.
- `Core/Interface/Windows/PageWindow.tsx`, `PageHistoryWindow.tsx`: the tabbed preview window and the single-state File History window.
- `Core/Actions/entityMenu.ts`, `pageMenu.ts`, `trashMenu.ts`: the menus carrying Delete.
- `Core/Interface/Notifications/notifications.ts`, `NotificationLabel.tsx`: the notice, its Undo, and its hover pause.
