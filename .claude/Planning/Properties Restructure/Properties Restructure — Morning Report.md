## Properties Restructure — Morning Report

**DATE:** 10-22-2026
**STATUS:** Executing through `c/plan-execution`; Phases 1–6 landed (10-23-2026).

### What the Plan Is

The Properties Restructure is a top-to-bottom cleanup of how Pommora handles properties, the fields like Status, Tags, Due Date, or Priority that pages and Spaces carry. Properties grew across many sessions, and most of how they work behind the scenes reflects what earlier agents judged appropriate rather than what you asked for. The same job is often done several ways, old code lingers for file layouts no Nexus still holds, and a handful of real bugs sit in the gaps. The work covers everything whose job is properties, wherever it lives in Pommora [A-2], treats the finished Archive work as current ground truth [A-3], and answers to the Brief's approach and principles [A-1].

Most of it changes nothing you'll see. Where something does change, it's either a decision you made during the brainstorm (cited as [B-1], [J-10], and so on, from *Properties Restructure — Decisions & Intention*) or a reading planning took in your place, a Last Call (cited as [LC-#]) listed below for awareness.

**The Shape:** 21 phases, run in order, each small enough for one agent to finish and each leaving Pommora working:

- **P1 · Removal First:** removes code that only exists to read files older Pommora versions wrote, an unreachable refusal, and an unused field, and moves two general helpers to where they belong.
- **P2 · What Counts as a Property:** the nine property types and Context are defined in one place. Title, Created, Modified, and Location become built-in fields, also defined once.
- **P3 · Type Records and Looks:** each type's facts are stated once per type: how it connects, how it looks when blank, its chip shape, and its display styles.
- **P4A · The Value Write's One Home:** every single-file value write goes through one module, and files are named for what they hold.
- **P4B · The Tidy Rule:** one rule for tidying values. A value of only spaces reads as empty, and writing the same value writes nothing. Repair Properties On Open is on by default.
- **P5 · One Home per Definition:** each Collection lists the ids of the properties it uses. A damaged property list opens with a notice instead of hiding every Space.
- **P6 · Undo From the File:** each value write records what the file held, so undo puts back exactly that. The window stops re-encoding values itself; a speed check confirms this costs nothing.
- **P7 · One Door for Property Changes:** nineteen separate change channels become fourteen operations through one door, under one lock rule. The option menu's "Remove" reads "Delete".
- **P8 · Option Identity:** options get permanent ids, so renaming one no longer rewrites every view. NexusOS converts once, after a backup.
- **P9 · List First:** a Context rename writes down its file list before it starts, and unfinished work replays from one place when the Nexus opens.
- **P10 · One Finder:** one way to find which files hold a property or a Context, and every restore miss is reported.
- **P11A · One Note per Item:** the crash-recovery notes become one file, `.nexus/.owed.json`, with one entry per item. Every many-file change runs on one runner with one Try Again, and a name still owed can't be reused.
- **P11B · Deletes and Remove:** Context and Space deletes, and a property's Remove, finish through those notes.
- **P12 · The Stash and Trash Records:** removed values are kept in a dated stash that ages out, and the phase adds Trash parking, the order restores happen in, and a mark for a partial restore.
- **P13 · Columns Carry Their Answer:** each column carries its type and definition, so cells, sorting, and filters stop looking them up again.
- **P14 · The Per-Kind View Record:** filtering, sorting, grouping, and new-row values are stated once for each kind of value.
- **P15 · Pick Model and One Writer:** one model for picking values, one value writer, and one set of menu words.
- **P16A · One Value Seat, the Table and Cards:** one component opens and edits values in the table and in Cards.
- **P16B · One Value Seat, the Native Menus and the Panel:** the native menus and the page panel join that component, and the made-up Context definition leaves.
- **P17 · The Properties Pane:** one drag model and one editor spacing. The five type editors become row lists in one file, and an editor whose property disappears returns to the list.
- **P18 · The Documents Read True:** feature documents, Issues entries, drives, and matrices are updated to match.

**How It Runs:** one agent per phase applies each step with the plan-replay tool, finishes what the tool can't, and proves the phase with the type check, tests, lint, and a click-through drive of the app. Every second phase ends with two reviewers reading the two phases just finished: one checks that they work and are as simple as they can be, the other how they fit the rest of the app and what else can be folded away to cut more lines. What doesn't work is fixed before the next phase starts; a fold lands right away unless a later step still edits that file, in which case it waits for the final review. The documents phase gets a lighter check of its own. A neutral check runs after Phase 12 and at the end, and one final review covers everything.

**When It's Done:** Pommora has about 448 fewer lines of production code, each property type's facts live in one place, every value change reaches its file one way, every big multi-file change can be finished with one Try Again, options have permanent ids, and the documents describing all of it are accurate.

### What I Need From You

Your seven decisions are folded into the plan as its own design, and the walkthrough below reads with them. What's left is a short list of small visible changes, for awareness only.

#### Small Things You'll See

No action needed. These are visible changes the plan makes on its own; speak up if one sounds wrong. Bug fixes and behind-the-scenes changes aren't listed, since they aren't yours to call.

- **LC-13:** deleting a property or option no page uses still asks first, without the "stripped from 0 Items" wording.
- **LC-15:** a File value's right-click in the Properties panel matches Cards: it gains Remove, and the label's menu matches the value's.
- **LC-16:** undoing a Link value's new display name also undoes the alias it added to the linked page.
- **LC-26:** the stash of removed values ages out after your History Timeframe. Restoring from the Trash doesn't reset that clock, and removing a second property into the same stash restarts it.
- **LC-37:** a Trash item that was only partly saved shows a warning mark, and restoring it says some of it may not come back.
- **LC-40:** the Pommora Project tile's leftover "open" and "closed" collapsed groups, which match no option, are dropped.
- **LC-52:** a page title containing a link sorts and filters by the text you see, like Text values do.
- **LC-54:** On a card, the Add chooser still slides into a Select's, Status's, Multi-Select's, or Space's options inside the same menu (‹ Properties › the property), while a Number, Date, File, Link, Checkbox, or Text opens its own picker or field; moving from one value's picker to another's, on a card or in the Properties panel, opens a fresh picker as the table does, and the panel's popup fades out.
- **LC-55:** every property editor uses the same 8px row spacing. The Date editor's rows were at 4px.
- **LC-60:** if a property disappears while its editor is open and then comes back (an undo or a sync), its editor reopens.

### Where It Stands

- **Execution:** Phases 1 through 7 of 21 have landed, at −388 production lines against a written −387. Phase 4A landed 8 over its figure to keep a read error's wording and break an import loop, and Phase 7 landed 9 over: 7 for its review's fix, which makes a property rename or delete wait while an earlier change is unfinished instead of stranding its own missed files, and 2 to keep a test helper apart from the setup every test loads. The review after Phase 2 folded 11 more lines out, your P-4 took 7 out, and Phase 6's review fixed two undo defects and folded four hand-built writers into one. Phase 6's speed check, F3, passed. The smaller folds the reviews found either landed or wait in the execution log for the last phase that touches their files. After each review, every remaining change was applied in a throwaway copy of the landed code, and it fits as the plan expects. Your bar of at least 550 lines removed overall sits 97 past the written −453, and 123 past the −427 expected once the two rulings landed after Phase 7 are counted; putting restored values back where they stood (E-4) costs 61 of the written figure across Phases 11B and 12, so the smaller folds waiting in the log and the review after the last phase are where that gap closes.
- **The Plan:** 21 phases and 140 tasks. Every code change applies mechanically: the replay tool applies 2,559 changes with no mismatches and skips 9 that land only if a speed measurement fails.
- **The Numbers:** about −453 production lines if every speed measurement passes; about −377 if F3 fails, and about −315 if all three fail. The plan ends below zero on every outcome; the running count rises above zero after Phase 11B (peaking at about +238 after Phase 12) before Phase 16A brings it back down, and if F3 fails it rises above zero after Phase 11B (peaking at about +319 after Phase 12) before Phase 16B brings it back down. Seven phases add lines (P4B, P6, P10, P11A, P11B, and P12, plus P15 only if its speed check fails), each because it lands a ruling or a repair no existing code performs; *Planning Findings › §The Ledger* gives each one's reason.
- **The Reviews:** two reviewers raised 114 findings; 103 were applied, 5 rejected with reasons, 5 became Last Calls, and 1 was replaced by a different fix. Replaying the plan in order then found 48 defects that would have broken a phase, such as a removed import still in use, and two correction passes fixed them.
- **The Dry Run:** the whole plan was applied in a throwaway copy and type-checked at every phase end. Phase 1 compiles clean; from Phase 2 on, each phase end shows new errors, about 120 in app code and more in tests, mostly from steps the plan states in words, like rewriting a test. Execution fixes these in the real code, where each phase's checks prove the fix, so the rule that every phase leaves a working state is true at execution rather than on paper.

### The Walkthrough

How each area works today, what you'll notice, the decisions it rests on, and the cleanup that needs no call.

#### Properties and Their Types

**Today:** Pommora keeps one list of types that does two jobs: what a property can be, and what kind of column a view can show. Because of that, Created Time, Last Modified, and in places Title ride along as if they were property types, and guards across the app keep them from being treated as real ones; one written into the property list by hand shows up as a dead or uneditable property. Neither timestamp is stored: Created Time is read from the moment encoded in the page's ID, and Last Modified from the file itself. A page's Icon is already neither a property nor a column; it lives in Pommora's page-info files beside the page's aliases. Each type's facts, such as its name, its icon, how it sorts, whether it can group a view, and which editor opens, are scattered across many tables and one-off checks.

**What Changes:** The property types become the nine you can create plus Context. Title, Created Time, Last Modified, and Location form their own group, Filedata, with one table holding their names and icons. Also: LC-52.

**Your Calls:**
- [F-1] Context stays a property type.
- [F-2] Created Time and Last Modified leave the property types for their own group of file-derived fields, named Filedata.
- [F-3] Title and Icon are built-in fields rather than types.

**Behind the Scenes:**
- Each type's facts move into two tables, one for the part of Pommora that reads and writes files and one for the part that draws the screen, so adding or changing a type is one entry instead of a hunt.
- The hand-written "a type, or Title" exceptions become one list of column types.
- The guards that filter fake properties back out of the panel, the sort menu, and the right-click menus leave, because the property list refuses them on the way in.
- Picker choices built from lists of labels are built one way.

#### Values and What's Written in Your Files

**Today:** A page holds its values in its front matter, the block of properties at the top of its file; a Space holds its values in its own settings file. Reading is clean: nothing that reads ever writes. Writing works, but its pieces are spread across three folders, every edit reads the page twice and re-reads the whole property list from disk, and the screen's preview of an edit is worked out separately from the real write. Any edit to one property also tidies the page's others: a single-word Select becomes a one-item list, and duplicates collapse. Text holding only spaces, written outside Pommora, reads as filled, though both of Pommora's editors save spaces-only as empty. Re-picking a value a Space already holds rewrites its settings file anyway.

**What Changes:**
- A value holding only spaces reads as empty for every type, in cells, in "is empty" filters, and in sorting.
- Clearing a property a Space doesn't hold tidies its other properties, as a page already does, and a write that changes nothing writes nothing.
- A Select or Status holding several words is written as the one option it shows whenever any value on its page changes, or at Repair On Open; one naming no option stays as written.
- A repeated entry reads once: a Multi-Select or File value, and a Space listed twice on a page.

**Your Calls:**
- [J-1] Text holding only spaces counts as empty on every surface.
- [J-9] Clearing a property a page or Space doesn't hold tidies the holder's other properties on both.
- [J-2] Unchecking a checkbox keeps removing its key from the file.
- [P-1] A Select or Status holding several words ignores the ones no option names, shows the valid one written latest, and tidies to that one option on the next value edit.
- [P-2] Picking a Select drops unrecognized words, a Multi-Select pick keeps them after the picked options, and a Context pick drops Space names Pommora can't find, as today.
- [A-5] A Multi-Select keeps registering words added outside Pommora as its options.
- [P-4] A Space listed twice on a page shows once.

**Behind the Scenes:**
- One module owns landing a value in a file, so each edit reads the file once, and the hand-made copies of the same tidying step become one.
- A check that refuses value shapes no path can produce goes.
- Tests stop writing values a way the app never does and share one way of building a sample Nexus.
- Files named "value" that mean different things get names saying what they hold.
- The property list is reused from memory while its file is unchanged, and creating a page with starting values writes it once instead of once per Context.
- Title stops posing as a Select value internally and reads as plain text.

#### Undo

**Today:** The screen keeps undo's memory: it notes what it last read of the page before the change, and undo sends that back. That's close to the file but not exact. A property written bare (just `Status:` with nothing after it) comes back as `Status: null`. Undoing a Context pick on a tag naming a Space Pommora can't find, such as an Obsidian typo, deletes the unknown names. A second edit made before the screen catches up can make undo send back the screen's guess. Giving a Link value a new display name also gives the linked page that alias, and undo leaves the alias behind.

**What Changes:** Undo puts back exactly what the file held. The part of Pommora that writes the file notes what the edited property said just before the change and hands that note back, and undo restores it for that one property only, leaving the tidy-ups to other properties in place. A bare `Status:` comes back bare, unknown tag names survive, and undoing a Link value also takes back the alias it added without touching an alias the page already had. An undo that can't reach a file offers Try Again, which puts back only what it missed, so it never overwrites an edit you made since. A line undo puts back lands where it stood in the front matter, above the line it sat above, rather than at the bottom; if that line is gone since, it lands at the bottom. Also: LC-16.

**Your Calls:**
- [E-1] Undo puts back what the file held, recorded by the part of Pommora that writes the file.
- [E-2] Undo puts back only the edited property.
- [E-3] Undoing a Link value also takes back the alias it added.
- [E-4] Every put-back lands a line where it stood, across all front matter: undo, Trash restores, and re-adding a removed property.

**Behind the Scenes:**
- Two undo routes and two ways of putting text back become one each, shared with the put-back multi-file changes already use.
- The screen stops working out the encoded value itself while a write is in flight and shows the pick, once a speed check on a large test Nexus confirms that costs nothing.
- The screen's undo list stays the one owner of undo order and depth, cleared on a Nexus switch as today.

#### Crash Recovery and Big Multi-File Changes

**Today:** Some changes rewrite many files: renaming a property or changing its Label Format, deleting it, and renaming or deleting an option. Before starting one, Pommora writes a crash-recovery note in the Nexus's hidden settings folder (.nexus) saying what it's about to do, so it can finish after a crash or a file it can't reach, like an iCloud file that isn't downloaded. There are exactly two notes, one shared by every property and one shared by every Context and Space, each with room for one change and each kept on its own device. Rename Priority to Urgency while two pages sit in iCloud, and the note holds the rename while you see "Couldn't update 2 Items" with Try Again. Rename Status to Stage before those pages arrive, and the note is already full, so the Status rename runs unprotected; a crash halfway leaves pages split between `Status:` and `Stage:` with nothing able to finish it. Meanwhile, any option rename, Value Format change, or option delete anywhere is refused with "An earlier change hasn't reached every file yet." A property delete updates the property list last instead of first. Context and Space deletes write no note, and if any page can't be reached they put everything back and refuse. Try Again works four different ways, while removing a property from a Collection or clearing an option offers none. A new property named Priority while the rename is owed quietly becomes "Priority (2)," and one named after a deleted property whose cleanup is unfinished takes the name, ends that cleanup, and inherits the values left on the pages it never reached.

**What Changes:**
- Every property, Context, and Space keeps its own entry in one hidden notes file, `.nexus/.owed.json`, so Priority's unfinished rename never touches Status.
- Every big change updates the property or Context list first and the files second. A Context or Space delete that misses pages finishes what it can and offers Try Again, as a property delete already does.
- A Remove that missed pages returns you to the property list and offers Try Again.
- Option renames, format changes, and option deletes stop being refused because some other property owes work.
- A name still owed to an unfinished change is finished first: Pommora runs the leftover work, then does what you asked, and shows an error with Try Again only if the leftover work still can't finish. This covers properties, Contexts, Spaces, and Trash restores alike.
- Clearing an option that misses pages offers Try Again, which clears the pages still holding that option; a page you've since set to another option keeps it, and one you've set back to the cleared option is cleared with the rest.
- A change made while a rename is still unfinished, such as renaming an option while Priority's rename owes two pages, counts those two pages in its own notice with Try Again instead of reporting success.
- A page Pommora can't safely rewrite (no ID, an ID another page shares, or malformed properties at the top) counts as unfinished with Try Again for every change: renames, deletes, option changes, and Context and Space changes, not only Remove.
- Deleting a page, Collection, or Set, emptying the Trash, moving a page or Set, and restoring something also note what they owe: a link or saved view they can't reach is finished by the same Try Again, and a crash halfway is finished at the next open. Moving a page again before that carries the missed links to where it ends up. A restore that worked out a value it couldn't write, such as a returning page's tidied tags or a link going back into a trashed page, remembers exactly what it worked out, and Try Again writes it unless you've changed that value since.
- Clearing the exclusion cache, and restoring or emptying several Trash entries at once, offer Try Again when something was missed.
- A damaged settings file goes to your computer's Trash when Pommora rebuilds it, instead of staying in the Nexus as a hidden `.bad-` copy; the notes file follows the same rule, and it's removed once nothing is owed. A notes file damaged before Pommora could read it says once that its unfinished work was lost, where today that loss is silent.

**Your Calls:**
- [B-1] Every property, Context, and Space keeps its own note; dropping the notes was rejected, since nothing could finish a change the app quit during.
- [B-2] The list changes first and the files second, as a property rename already does.
- [B-3] A delete that can't reach every page finishes what it can and offers Try Again, for properties, Contexts, and Spaces alike.
- [B-4] A new property reusing a deleted property's still-owed name first finishes that cleanup, then lands; if the cleanup still can't finish, it's refused with Try Again. A numbered name was rejected, since it would sidestep the cleanup.

**Behind the Scenes:**
- The separate note systems for properties and for Contexts become one, and the hand-placed guards built around the one-change limit leave.
- Every many-file change runs on one runner.
- Opening a Nexus finishes owed work at one point instead of two, after Pommora's page index is ready rather than before.
- A Context rename's backwards undo-everything path leaves, since a failed list update happens before any file moves.
- Deleting a property list-first closes a gap where an edit could land on a page just after its value was stripped.
- A field in the Context note that's written and never read goes.

#### Where a Change Reaches

**Today:** To change a property or tag across the Nexus, Pommora first finds the files that hold it. For pages, it asks its index, a quick-lookup record of every page's values. For Spaces, it opens every Space's settings file on disk every time, though it already holds them all in memory. Context changes find pages a third way that skips the "only inside Collections" filter, so a Context rename reaches loose pages outside every Collection, like NexusOS's quick-filter page in the Agenda folder, while a property rename doesn't; nobody ever stated that as a rule. Four Trash and restore routines write Space files with their own loops, and two of them ignore a failed write. On every open, Pommora also re-reads every page in every Collection with a Multi-Select, to register words added while it was closed.

**What Changes:** A restore that couldn't update a Space's file or a returning page still completes and tells you; one it could read offers Try Again, and one it couldn't read gets a warning. Otherwise, nothing you'll see.

**Your Calls:**
- [G-1] One shared way of finding files for every change: pages from the index, Spaces from what Pommora already holds.
- [G-2] A property reaches the pages of Collections and the Archive, and a Context tag reaches any page, because a tag means something anywhere.
- [G-3] A restore that can't update a Space's file or a returning page reports a warning.

**Behind the Scenes:**
- One finder answers which pages and Spaces hold a property or a tag, and one writer updates them.
- Pommora's in-memory Spaces gain a record of the Context tags they carry, so Context changes use the same finder.
- Registering Multi-Select words at open reads the index instead of every page.
- Collections remember which properties they use by id instead of keeping full copies, so a property arriving by sync or hand edit stops forcing a re-read of the whole Nexus.
- The on-open repair builds its picture of a page from what Pommora already holds.

#### Removing a Property and Its Stash

**Today:** Removing a property from one Collection, as opposed to deleting it everywhere, takes its values off that Collection's pages, archived ones included, and keeps them in the stash inside the Collection's settings file, so re-adding the property brings them back. You chose this in July, before sync. A page that later moves to another Collection or is deleted keeps its stash entry forever, which drifted from your July ruling that such entries are dropped. A page sitting in the Trash when the property is re-added gets nothing back. A Remove that can't read some pages leaves their values in place, unstashed, and a second Remove does nothing. A re-add that can't write some pages leaves their values waiting in the stash without telling you. The code and the settings file call the stash a "cache."

**What Changes:**
- Re-adding a property drops stash entries for pages that left the Collection.
- Stash entries are cleaned out once they're older than the History Timeframe setting (LC-26).
- A re-added property's values land where their lines stood on each page, rather than at the bottom (E-4).

**Your Calls:**
- [C-1] Remove keeps moving values off the pages and into the stash; retiring the stash was rejected, since it would leave hidden values on pages, which you ruled out in July.
- [C-2] The stash loses nothing under sync, drops entries for pages that left, and lets a missed Remove be retried.
- [C-3] The stash stays in the Collection's settings file, kept for the History Timeframe; a timeframe of its own is filed as I-077.
- [H-2] The stash's sync loss waits for the Sync rebuild.

**Behind the Scenes:**
- Restoring a deleted property from the Trash writes its stash back before re-adding the property, so the values actually refill.

#### Options and Saved Views

**Today:** Options, the choices in a Select, Multi-Select, or Status, have no permanent identity; they're known by their word. Saved views remember options by word too, in a custom sort order, a group order, hidden and collapsed groups, and a filter's values, so renaming an option rewrites every view, tile, and graph filter that mentions it, and on two devices a rename can race a view edit and leave a filter that silently stops matching. Collapsed groups are remembered by bare name: collapsing "Done" under Status also collapses a "Done" under any property you later group by, and a collapsed month collapses under every date property. Deleting the property a view groups by also forgets which folder groups you'd collapsed. Each Status option stores the id of the group it sits in, though it already sits inside that group; nothing reads it, and a hand edit leaving it out makes the whole property vanish.

**What Changes:** Every option gets a hidden permanent id, the way properties already do. Your pages keep holding the option's word, so your files and Obsidian read exactly as now. Views, tiles, the graph filter, and preview rules point at the id, so a rename stops rewriting them, while it still rewrites the pages holding the old word. Pommora already works this way for Context tags. Collapsed groups are remembered per property, as hidden groups already are, and deleting a grouped property keeps your folder collapses. Status options stop storing their group's id, and one written by hand without it reads. An option written by hand without an id still works and gets one the next time Pommora changes the property list. Saved view settings show option ids where they showed words, as they already show property ids.

**Your Calls:**
- [D-1] Every option carries a permanent id, pages keep the word, and NexusOS is converted once.
- [D-2] Collapsed groups are remembered per property, with NexusOS's existing ones converted.
- [D-3] Status options stop storing their group's id, stripped from NexusOS once.
- [K-1] Deleting the property a view groups by keeps which folders were collapsed.

**Behind the Scenes:**
- The machinery that rewrites views on every option rename leaves, along with the tests for keeping an option's popup attached through a rename.
- One builder makes the keys for hidden and collapsed groups, replacing two.
- The NexusOS conversion runs once, after a backup, and leaves, rather than living in Pommora as a conversion on every open.
- Option ids make merging options one at a time possible for the Sync rebuild.

#### The Properties Panel, Cells, Cards, and Right-Click Menus

**Today:** Values appear in table cells, card fields, the Properties panel, pickers, filters, group headers, and right-click menus. They all draw values through one shared piece, but what happens when you click or right-click a value is copied three times, for the table, cards, and the panel, with a fourth version for the native menu, and the copies have drifted. The panel's right-click on a File value skips the Remove every other panel row offers. A Link row's name in the panel offers Clear and Remove while its value offers Edit and Rename. The two link menus word and order their rows differently ("Edit, Rename" against "Rename, Edit Title"). The text pen's spoken label reads "Open in TextPane," a code name. A Select's compact chip uses a tag icon while the Select type's own icon differs, and every user-made Status group draws a dashed circle.

**What Changes:**
- A value's right-click menu reads the same in the table, cards, and panel, and the panel's row label opens the same menu as its value.
- In the panel, a Link row's name gains Edit Title and Edit Link.
- Every link menu names its two edits the same way: Edit Title changes the text the link shows, and Edit Link changes where it points, the linked page or the address.
- The text pen's spoken label reads "Open In Editor."
- Also: LC-15, LC-54.

**Your Calls:**
- [J-10] A value's right-click reads the same wherever it opens, and the panel's File value gains Remove.
- [J-3] A Link row's name gains its value's edit and rename.
- [J-4] The pen reads "Open In Editor."
- [J-5] A row added in the panel stays shown while it's empty, as a blank row on every other page.
- [J-6] Cards keep hiding a chip's remove button below 80% zoom.
- [J-7] Adding a File value from a card's chooser keeps its typed-path field.
- [J-8] Whether the value picker can create Status options was planning's to recommend.
- [M-1] A Select's compact chip keeps its tag icon, and the feature document is corrected to match.
- [M-2] User-made Status groups keep the dashed circle.

**Behind the Scenes:**
- The copies of value click-and-menu handling become one shared piece, which also replaces the native menu's separate version.
- The rules for picking a value, written once for one row and again for many, are written once, and the ways of hooking a value up to its write become one.
- Misplaced and misnamed files move or get accurate names.

#### Views: Filtering, Sorting, and Grouping

**Today:** Each type's view behavior, meaning which filter rules it offers, how it sorts, and how it groups, is decided in many separate places, and each cell looks its property up again instead of being handed it. A filter rule with an unreadable value, like letters typed into a Number filter, passes every page, so inside an "Any" group it makes the whole group match everything. A Checkbox's "is not empty" passes every page. Empty values sort by unrelated rules depending on type. A filter's date picker uses the Nexus clock while a value's uses the column's clock.

**What Changes:**
- An unreadable filter value is ignored instead of matching everything, which also changes which values a new page created in that view inherits.
- A Checkbox's "is not empty" works.
- Empty values sort last in either direction for every type except Checkbox.
- A filter's date picker uses the column's clock.

**Your Calls:**
- [K-1] An unreadable filter value is ignored, and a Checkbox's "is not empty" works.
- [K-2] Empty values sort last, and dragging a row into another value's run in a sorted view keeps reassigning its value.
- [J-1] A filter's date picker uses the column's clock.

**Behind the Scenes:**
- A view works out each column's type and property once instead of once per cell.
- "A value as the text you see" is computed one way for filtering and sorting.
- New views save an empty list of hidden properties instead of listing every one, with the same Title-only start.
- A third type table, for view behavior, gathers each type's filter rules, sorting, grouping, and new-row values.
- Speed checks on a large test Nexus decide whether views need updating in place after an edit and whether the graph filter needs a cache.

#### The Property Editors and Each Type's Settings

**Today:** The Properties pane in Collection Settings is where you create and configure properties and options. Each type's settings editor is built its own way, so spacing differs: hiding the Day row in a Date editor leaves an extra gap, and in the Number editor every row that can appear or disappear has lost its spacing. A Date's look is saved per view, following the Settings window's Date Format and Time Format until a view picks its own. A Link's Format sits on the property as every view's default, with a column override, and its Underline and Color sit on the property. A Number's Format, Currency, Separators, Decimals, and Fraction sit on the property, and its Number or Bar look is per view. A Checkbox's Color sits on the property, and its Checkbox or Switch look is per view. A column's right-click calls Number's look "Format," while every other type's reads "Style." The Decimals picker reads "Hidden" when unset, though cells show decimals. A fraction denominator of zero or less is saved and silently ignored. An editor whose property disappears shows "Property not found."

**What Changes:**
- Every type's editor shares one layout (LC-55).
- A column's right-click calls Number's look "Style," while Link's stays "Format" and Date's choices read "Format," as Date's own settings pane heads them.
- A fraction denominator of zero or less is refused.
- An editor whose property disappears returns to the property list (LC-60).
- The standard header's spoken "Edit icon" reads "Edit Icon," as every menu spells it.

**Your Calls:**
- [L-1] Every type's editor shares one layout with its spacing fixed.
- [L-2] Icons on every type's settings rows, as Date's have, are filed for your later settings-pane pass (I-076) rather than done here.
- [L-3] Decimals keeps reading "Hidden" when unset, and a denominator of zero or less is refused.
- [L-4] The option popup's title field and footer stay.
- [I-1] The pane's layout and wording stay for your I-076 pass; no row moves and no row's words change.
- [I-2] Each type's settings keep reaching where they reach today.
- [I-3] An unset Link Format stays Full Link, since Default Link Format is set per device and governs pasting.
- [I-4] Number's look reads "Style" in a column's right-click, and Date's choices read "Format."
- [O-5] An editor whose property disappears returns to the property list.

**Behind the Scenes:**
- Each type's available looks are stated once instead of narrowed by hand in several places.
- The five editors become per-type lists of rows in one file, drawn by one shared layout, so adding a row's icon later is one addition per row.
- Every change to the property list waits its turn the same way, creating a property and reordering one included.
- The pane's drag model moves into the design kit, and small duplicates in the pane's code merge.

#### The Trash, the Archive, and Confirmations

**Today:** Every remove, clear, and delete question already lives in one place shared with the Trash and the Archive, but the counting words are split across two places, and deleting a property or option held by nothing still asks and says "stripped from 0 Items." An option's "Remove" deletes it for good, while Remove everywhere else can be undone. Every Trash entry records whether it's partial, meaning the delete couldn't record everything it touched, and nothing shows it. A taken name quietly becomes "Name (2)." Label Format and Value Format changes ask before rewriting your pages, while a property or option rename rewrites the same pages without asking.

**What Changes:** An option's Remove reads Delete. Confirmations count correctly, zero included. A restore that takes a numbered name says so, and so does a property, Context, or Space create when its name is taken ("Created “New Space (2)”."); a page, Collection, or Set keeps numbering itself quietly, since their titles can repeat. Any change that rewrites a key or option word on your pages asks first with the same count, a rename included, while changing only the display label asks nothing. A Trash entry is marked partial only when something it held truly couldn't be recorded. Emptying a deleted property from the Trash drops it from every Collection still listing it, one restored since or one still in the Trash. A restore puts each line back where it stood on its page, for a property's values, a Context's or Space's tags, and a Link a deleted page took away, rather than at the bottom (E-4). Also: LC-13, LC-37.

**Your Calls:**
- [O-1] An option's Remove reads Delete, so Remove only names something that can be undone or restored.
- [O-2] Every confirmation counts its Items correctly, zero included, in one vocabulary from one home the Archive and the Trash share.
- [O-4] Creating a property, Context, or Space under a taken name tells you it took a numbered name; pages, Collections, and Sets number themselves quietly, since their titles can repeat (your ruling).
- [Ruled] Keys ask, labels don't: every change that rewrites a key or option word on pages asks with the existing count, and a label-only change asks nothing.
- [N-1] The partial mark shows on the Trash entry, and a partial restore tells you so.
- [N-2] Deleting a property keeps creating a Trash entry in either Trash mode.

**Behind the Scenes:**
- The counting words move into one shared home both halves of Pommora can use.
- The property delete's hand-made ask, delete, and notify steps fold into the shared confirmation flow.
- Restoring a property stops re-checking what creating one already checks.
- The internal names behind an option's Remove become Delete to match.

#### Settings and Defaults

**Today:** Repair Properties On Open, which tidies values on pages changed outside Pommora since the last open, is off by default, though NexusOS already has it on. A damaged property list stops the whole Nexus from opening, while a damaged Context list opens the Nexus with Contexts blank and a notice offering Try Again.

**What Changes:** Repair Properties On Open is on by default for every Nexus; it never touches a Nexus the first time Pommora opens it, and NexusOS sees no change. A damaged property list opens the Nexus with Properties marked unreadable and a notice, as Contexts already do; nothing writes to the list while it's damaged, and fixing the file recovers it.

**Your Calls:**
- [O-3] Repair Properties On Open is on by default.
- [O-6] A damaged property list opens the Nexus with Properties marked unreadable.

**Behind the Scenes:**
- The unreadable notice names which list is damaged, so a damaged property list isn't mistaken for a damaged Context list and doesn't hide every Space from tiles.

#### Sync

**Today:** When two devices change the same file before syncing, Pommora merges the versions, and how finely depends on the file's layout. The property list merges one setting at a time. The weak spots are a property deleted on one device while edited on another, which leaves a broken, invisible scrap in the list forever (a test pins that as intended); two devices creating the same name, which leaves one hidden without notice; option lists, a Collection's list of its properties, and the stash, which each merge as one whole item; and two devices setting different properties on one page, which loses one edit, kept only in the conflict capture. A Space's settings file already merges cleanly.

**What Changes:** Nothing; Sync's rules and tests stay as they are while it awaits its rebuild.

**Your Calls:**
- [H-1] Sync's merge rules stay, its losses are recorded as inputs for the rebuild, and a fix lands here only where it removes a loss without a new Sync rule; changing the rules now was rejected, since it would add rules to a design about to be replaced.
- [H-2] Option ids still land for what they fix outside Sync.

**Behind the Scenes:**
- The Sync feature document's example of why the property list merges one setting at a time is rewritten around the real reason.
- The losses are listed for the rebuild in *Planning Findings › §Sync Rebuild Inputs*.

#### Tests and Documents

**Today:** The Properties folder holds more test lines than code. Some rules are checked many times across files, many test titles carry labels left over from old planning rounds, and a few tests pin behavior that's already gone. The Properties feature document mixes an overview with low-level mechanics, and several of its claims are false. Several Issues entries cite stale line numbers or propose moves the code rules out. The option-picker test script still expects a confirmation for clearing an option from one page, which Pommora stopped asking for on 10-19-2026.

**What Changes:** Nothing in the app; the documents you read become accurate.

**Your Calls:**
- [A-1] The Brief's rule that tests, comments, documents, and Issues entries get the same deep clean as the code.

**Behind the Scenes:**
- Each test pins one intended behavior once: duplicates collapse, test files share one way of building a sample Nexus, and planning-round labels leave their titles.
- Tests of removed or incidental behavior leave with it, such as the tests of the one-change note limit and of the option popup's rename bookkeeping.
- The feature documents' false claims are rewritten, and the Issues entries touching Properties (I-006, I-032, I-035, I-036, I-039, I-042, I-061, I-062, I-063, I-064, I-076, and I-077) are resolved or narrowed.
- Comments that only restate the code or claim constraints that don't exist go.
- The test scripts follow today's confirmation rule and the changes to "Open in TextPane," an option's Remove, and the Status group id.

#### Leftover Old Code

**Today:** Pommora still carries code for reading file layouts only earlier versions of Pommora wrote: old spellings of property types, old names for two view settings, and an old way of remembering hidden groups. Every open reads the Trash, the Archive, and the homepage files looking for those spellings, and neither NexusOS nor the test Nexus holds any of them. Several shared pieces sit in the Properties folder only because Properties wrote them first, the folder mixes files that run in the background with files that draw the screen with nothing to tell them apart, and words like "value," "Remove," and "held" each mean several things.

**What Changes:** Nothing you'll see.

**Your Calls:**
- [A-4] Only NexusOS, the test Nexus, and the benchmark Nexuses need to keep reading, so code for shapes only earlier builds wrote leaves once a scan finds nothing holding them; the scan found none.

**Behind the Scenes:**
- The every-open conversion of old type spellings and view-setting names goes, along with the old hidden-group reading and the tests of file shapes no Nexus holds.
- Reading what other apps write, such as Obsidian's keys and checkbox words, stays, since that's what keeps your files readable outside Pommora.
- Shared pieces move to the folders that own them, such as the multi-file machinery into Pommora's Nexus handling, the file finder into the index, and the list-ordering helper into the design kit.
- Each concept carries one name.

#### What Stays the Same

- A Multi-Select registers words added outside Pommora as options [A-5].
- Context stays a property type [F-1].
- The Properties pane's layout and wording stay for your I-076 pass [I-1].
- Each type's settings reach where they do today: a Date's look per view, a Link's Format on the property with a column override, its Underline and Color on the property, a Number's format on the property with its Number or Bar look per view, and a Checkbox's Color on the property with its Checkbox or Switch look per view [I-2].
- A date column with no style set shows no time, and "show the time" follows the Nexus clock.
- Unchecking a checkbox removes its key [J-2].
- A Select or Status holding several words ignores the ones no option names and shows the valid one written latest [P-1].
- Picking a Select drops unrecognized words, a Multi-Select pick keeps them after the picked options, and a Context pick drops Space names Pommora can't find [P-2].
- A row added in the Properties panel stays shown while empty, and as a blank row on every other page, until you switch Nexuses [J-5].
- Cards hide a chip's remove button below 80% zoom [J-6].
- A card's File chooser keeps its typed-path field [J-7].
- Dragging a row into another value's run in a sorted view reassigns its value [K-2].
- The Decimals picker reads "Hidden" when unset [L-3].
- The option popup's title field and footer stay [L-4].
- A Select's compact chip keeps its tag icon, and user-made Status groups keep the dashed circle [M-1, M-2].
- Deleting a property creates a Trash entry in both Trash modes [N-2]; NC-1 covers Context and Space deletes.
- Clearing an option and changing a format ask only past one Item, and removing a property from a Collection doesn't ask, since it can be undone.
- Renaming an option still rewrites the pages holding its word.
- Crash-recovery notes stay on the device that owes the work, since that device holds the unreached files.
- New views and value-less rows behave as today.
- The remaining edge rules [P-3], with their evidence in *Planning Findings › §Edge Rules*:
  - Two properties or options whose names differ only by capitalization or accents read as the first, and an option duplicate leaves the file on the next option edit.
  - Re-adding a removed property doesn't bring back a value whose option was renamed or deleted in the meantime.
  - Select and Status values are saved as a one-item list, so Obsidian treats them as lists.
  - Checkbox properties can't group a view, and Context columns can't sort one.
  - Picking an option across several selected rows clears it when every row already holds it and sets it otherwise.
  - The one-line text field edits only a value's first line.
  - A custom option sort reads in your custom order and ignores Default and Reversed.
  - A restored Space loses an option deleted while it sat in the Trash.

#### Your Data

Four NexusOS files are converted once, after a backup, by a throwaway script, which then leaves:
- **Your Property List:** each of the 59 options across seven properties (Status 8, Tags 3, Brand 20, Concern 5, Scale 5, Color 12, Version 6) gains its id, and Status's eight options lose their group id.
- **The Ideas Collection's Settings File:** the "Table" view's group order, Status sort order, and collapsed groups, and the "Untitled View"'s group order and collapsed groups, switch from option words to ids. Collapsed Status groups are scoped to Status, folder collapses stay, and the lowercase "open" and "closed," which match no option, are dropped.
- **The Homepage Tiles File:** the first tile's "Active" and "Archive" views switch their Status sort orders and filters to ids.
- **The Pommora Project's Tiles File:** the third tile's "Ideas" view switches its Status sort order to ids, and its leftover Status collapses are kept and scoped to Status, with "open" and "closed" dropped (LC-40).

Every other collapsed group in NexusOS holds only folders and stays as it is, and no other view, tile, graph filter, or Trash entry names an option. No page changes: pages keep the option words they hold now, and nothing in any page's file changes shape. Nothing else on disk changes shape either, since NexusOS holds no stash, no old spellings, and no crash-recovery notes to convert. Going forward, Pommora keeps its one hidden notes file, `.nexus/.owed.json`, on each device, and removes it once no work is owed.

### Good to Know

- **The Issues Renumbering:** when Phase 18 closes three entries, the index script renumbers the rest, so I-076 and I-077 become I-073 and I-074.
- **Speed Checks:** a speed check that fails its threshold takes the fallback its rule names, and the final report gives its numbers; none becomes a new Issue or waits on you.
- **`reveal-parity`:** one older test script looks for a page `~/Test` doesn't hold; it sits outside Properties and stays as it is.
