### Properties Restructure — Walkthrough

**DATE:** 10-21-2026

The Properties Restructure is a top-to-bottom cleanup of how Pommora handles properties, the fields like Status, Tags, Due Date, or Priority that pages and Spaces carry. Properties grew across many sessions, and most of how they work behind the scenes reflects what earlier agents judged appropriate rather than what you asked for, so the same job is often done several ways, old code lingers for file layouts no Nexus still holds, and a handful of real bugs sit in the gaps. The work covers everything whose job is properties, wherever it lives in Pommora [A-2], treats the finished Archive work as current ground truth [A-3], and answers to the Brief's approach and principles [A-1]. Every behavior nobody asked for reaches you as a decision [A-6]; this session settled the decisions, with building to follow in fresh sessions [A-7, a reading you didn't object to]. Each section below gives how an area works today, what you'll notice, the calls it rests on, and the cleanup that needs no call. Most of it changes nothing you'll see, and a few things change on purpose.

#### Properties and Their Types

**Today:** Pommora keeps one list of types that does two jobs: what a property can be, and what kind of column a view can show. Because of that, Created Time, Last Modified, and in places Title ride along as if they were property types, and guards across the app keep them from being treated as real ones; one written into the property list by hand shows up as a dead or uneditable property. Neither timestamp is stored: Created Time is read from the moment encoded in the page's ID, and Last Modified from the file itself. A page's Icon is already neither a property nor a column; it lives in Pommora's page-info files beside the page's aliases. Each type's facts, such as its name, its icon, how it sorts, whether it can group a view, and which editor opens, are written in about 14 tables and about 25 one-off checks scattered through the app.

**What Changes:** Nothing you'll see. The property types become the nine you can create plus Context. Title, Created Time, Last Modified, and Location form their own group, Filedata, with one table holding their names and icons. A Context-typed property written into the property list by hand is set aside as not a real property, since Contexts come from the Context list.

**Your Calls:**
- [F-1] Context stays a property type.
- [F-2] Created Time and Last Modified leave the property types for their own group of file-derived fields, named and placed by planning.
- [F-3] Title and Icon are built-in fields rather than types.

**Behind the Scenes:**
- Each type's facts move into two tables, one for the part of Pommora that reads and writes files and one for the part that draws the screen, so adding or changing a type is one entry instead of a hunt.
- The 21 hand-written "a type, or Title" exceptions across 11 files become one list of column types.
- The guards that filter fake properties back out of the panel, the sort menu, and the right-click menus leave, because the property list refuses them on the way in.
- Picker choices built from lists of labels, built eight ways today, are built one way.

#### Values and What's Written in Your Files

**Today:** A page holds its values in its front matter, the block of properties at the top of its file; a Space holds its values in its own settings file. Reading is clean: nothing that reads ever writes. Writing works, but its pieces are spread across three folders, every edit reads the page twice and re-reads the whole property list from disk, and the screen's preview of an edit is worked out separately from the real write, so the two can differ slightly. Any edit to one property also tidies the page's others: a single-word Select becomes a one-item list, and duplicates collapse. Text holding only spaces, written outside Pommora, reads as filled, though both of Pommora's editors save spaces-only as empty. Clearing a property a page doesn't hold tidies the page's other properties, while on a Space it does nothing.

**What Changes:** Text holding only spaces reads as empty everywhere: in cells, in "is empty" filters, and in sorting. Clearing a property a Space doesn't hold tidies its other properties, as a page already does.

**Your Calls:**
- [J-1] Text holding only spaces counts as empty on every surface.
- [J-9] Clearing a property a page or Space doesn't hold tidies the holder's other properties on both; tidying neither offered no real simplification.
- [J-2] Unchecking a checkbox keeps removing its key from the file.
- [P-1] A Select or Status holding several words ignores the ones no option names and shows the valid one written latest, which is already today's rule.
- [P-2] Picking a Select drops unrecognized words, a Multi-Select pick keeps them after the picked options, and a Context pick drops Space names Pommora can't find, as today.
- [A-5] A Multi-Select keeps registering words added outside Pommora as its options.

**Behind the Scenes:**
- One module owns landing a value in a file, so each edit reads the file once, and three hand-made copies of the same tidying step become one.
- A check that refuses value shapes no path can produce goes.
- Tests stop writing values a way the app never does and use the app's real write.
- Files named "value" that mean five different things get names saying what they hold.
- The property list is read from a cache instead of from disk on every edit, and creating a page with starting values writes it once instead of once per Context.
- Title stops posing as a Select value internally and reads as plain text, which has to happen before options get ids.

#### Undo

**Today:** The screen keeps undo's memory: it notes what it last read of the page before the change, and undo sends that back. That's close to the file but not exact. A property written bare (just `Status:` with nothing after it) comes back as `Status: null`. Undoing a Context pick on a tag naming a Space Pommora can't find, such as an Obsidian typo, deletes the unknown names. A second edit made before the screen catches up can make undo send back the screen's guess. Giving a Link value a new display name also gives the linked page that alias, and undo leaves the alias behind.

**What Changes:** Undo puts back exactly what the file held. The part of Pommora that writes the file notes what the edited property said just before the change and hands that note back, and undo restores it for that one property only, leaving the tidy-ups to other properties in place. A bare `Status:` comes back bare, unknown tag names survive, and undoing a Link value also takes back the alias it added without touching an alias the page already had.

**Your Calls:**
- [E-1] Undo puts back what the file held, recorded by the part of Pommora that writes the file.
- [E-2] Undo puts back only the edited property.
- [E-3] Undoing a Link value also takes back the alias it added.

**Behind the Scenes:**
- Two undo routes and two ways of putting text back become one each, shared with the put-back multi-file changes already use.
- The screen's undo list stays the one owner of undo order and depth, cleared on a Nexus switch as today.
- A separate repair for the bare-key bug becomes unnecessary.

#### Crash Recovery and Big Multi-File Changes

**Today:** Some changes rewrite many files: renaming a property or changing its Label Format, deleting it, and renaming or deleting an option. Before starting one, Pommora writes a crash-recovery note in the Nexus's hidden settings folder (.nexus) saying what it's about to do, so it can finish after a crash or a file it can't reach, like an iCloud file that isn't downloaded. There are exactly two notes, one shared by every property and one shared by every Context and Space, each with room for one change and each kept on its own device. Rename Priority to Urgency while two pages sit in iCloud, and the note holds the rename while you see "2 Items weren't updated" with Try Again. Rename Status to Stage before those pages arrive, and the note is already full, so the Status rename runs unprotected; a crash halfway leaves pages split between `Status:` and `Stage:` with nothing able to finish it. Meanwhile, any option rename, Value Format change, or option delete anywhere is refused with "An earlier change hasn't reached every file yet." A property delete updates the property list last instead of first, though it already finishes what it can and offers Try Again. Context and Space deletes write no note, and if any page can't be reached they put everything back and refuse. Try Again works four different ways, while removing a property from a Collection or clearing an option offers none, and a second Remove does nothing. A new property named Priority while the rename is owed quietly becomes "Priority (2)," and one named after a deleted property whose cleanup is unfinished takes the name, ends that cleanup, and inherits the values left on the pages it never reached.

**What Changes:** Every property, Context, and Space keeps its own entry in one notes file, so Priority's unfinished rename never touches Status. Every big change updates the property or Context list first and the files second. A Context or Space delete that misses pages finishes what it can and offers Try Again, as a property delete already does. Clearing an option and removing a property from a Collection offer Try Again too, and a Remove that missed pages returns you to the property list instead of leaving the editor open on a property that's already gone. Try Again works one way: it finishes that item's unfinished work. Option renames, format changes, and option deletes stop being refused because some other property owes work. Creating a property under a name still owed to unfinished work is refused with the general message, and its Try Again finishes that work, which frees the name.

**Your Calls:**
- [B-1] Every property, Context, and Space keeps its own note, and every many-file change writes one; dropping the notes was rejected, since nothing could finish a change the app quit during. Planning shows you the recovery files, what owns each, and how a change flows through them before designing it.
- [B-2] The list changes first and the files second, as a property rename already does.
- [B-3] A delete that can't reach every page finishes what it can and offers Try Again, for properties, Contexts, and Spaces alike.
- [B-4] A new property reusing a deleted property's still-owed name is refused, and its Try Again finishes the cleanup; a numbered name was rejected, since it would sidestep the cleanup.

**Behind the Scenes:**
- The separate note systems for properties and for Contexts become one, and the seven hand-placed guards built around the one-change limit leave.
- Opening a Nexus finishes owed work at one point instead of two, after Pommora's page index is ready rather than before.
- A Context rename's backwards undo-everything path leaves, since a failed list update now happens before any file moves.
- Deleting a property list-first closes a gap where an edit could land on a page just after its value was stripped.
- The screen stops carrying its own copy of a note that might not exist; Try Again just names the item.
- A field in the Context note that's written and never read goes.
- A Trash entry for a partly finished Context or Space delete captures the unreached pages' values up front, as a property delete already does.

#### Where a Change Reaches

**Today:** To change a property or tag across the Nexus, Pommora first finds the files that hold it. For pages, it asks its index, a quick-lookup record of every page's values. For Spaces, it opens every Space's settings file on disk every time, though it already holds them all in memory, and one property delete does that three times. Context changes find pages a third way that skips the "only inside Collections" filter, so a Context rename reaches loose pages outside every Collection, like NexusOS's quick-filter page in the Agenda folder, while a property rename doesn't; nobody ever stated that as a rule. Four Trash and restore routines write Space files with their own loops, and two of them ignore a failed write. On every open, Pommora also re-reads every page in every Collection with a Multi-Select, to register words added while it was closed.

**What Changes:** A restore that couldn't update some files tells you with a warning, and the restore still completes. Otherwise, nothing you'll see.

**Your Calls:**
- [G-1] One shared way of finding files for every change: pages from the index, Spaces from what Pommora already holds.
- [G-2] A property reaches the pages of Collections and the Archive, and a Context tag reaches any page, because a tag means something anywhere (a reading you didn't object to).
- [G-3] A restore that can't update a Space's file reports a warning (a reading you didn't object to).

**Behind the Scenes:**
- Finding which files hold a property reads each file once instead of up to four times.
- Pommora's in-memory Spaces gain a record of the Context tags they carry, so Context changes use the same finder; keeping a disk check for that one case is the fallback if the record proves costly.
- Registering Multi-Select words at open reads the index instead of every page.
- Collections remember which properties they use by id instead of keeping full copies, so a property arriving by sync or hand edit stops forcing a re-read of the whole Nexus.
- The on-open repair builds its picture of a page from what Pommora already holds.

#### Removing a Property and Its Stash

**Today:** Removing a property from one Collection, as opposed to deleting it everywhere, takes its values off that Collection's pages, archived ones included, and keeps them in the stash inside the Collection's settings file, so re-adding the property brings them back. You chose this in July, before sync. A page that later moves to another Collection or is deleted keeps its stash entry forever, which drifted from your July ruling that such entries are dropped. A page sitting in the Trash when the property is re-added gets nothing back. Deleting the property everywhere cleans every Collection's stash except those of Collections sitting in the Trash. A Remove that can't read some pages leaves their values in place, unstashed, and a second Remove does nothing. Under sync, two devices removing different properties from one Collection overwrite each other's stash, because the whole stash is one setting in the file.

**What Changes:** Re-adding a property drops stash entries for pages that left the Collection, and a page in the Trash takes its value into its Trash copy, so it returns with it. Deleting a property everywhere reaches Collections in the Trash too. A Remove that missed pages offers Try Again, which also stashes the pages it couldn't read the first time. The sync loss goes away only if the stash moves into small files of its own, the open question under *§Still Open*.

**Your Calls:**
- [C-1] Remove keeps moving values off the pages and into the stash; retiring the stash was rejected, since it would leave hidden values on pages, which you ruled out in July.
- [C-2] The stash loses nothing under sync, drops entries for pages that left, and lets a missed Remove be retried, with planning proposing a better home where it finds one.
- [H-2] The stash's sync loss waits for the Sync rebuild unless its home fixes it without a new Sync rule (a reading you didn't object to).

**Behind the Scenes:**
- An empty wrapper layer inside the stash flattens.
- Restoring a deleted property from the Trash writes its stash back before re-adding the property, so the values actually refill; today they're skipped.
- A delete that fails to update a damaged Collection settings file is caught instead of ignored.
- If the stash moves to its own files, Pommora stops tracking stash copies on every Collection, and a delete's walk through every Collection folder goes.

#### Options and Saved Views

**Today:** Options, the choices in a Select, Multi-Select, or Status, have no permanent identity; they're known by their word. Saved views remember options by word too, in a custom sort order, a group order, hidden and collapsed groups, and a filter's values, so renaming an option rewrites every view, tile, and graph filter that mentions it, and on two devices a rename can race a view edit and leave a filter that silently stops matching. Collapsed groups are remembered by bare name: collapsing "Done" under Status also collapses a "Done" under any property you later group by, and a collapsed month collapses under every date property. Deleting the property a view groups by also forgets which folder groups you'd collapsed. Each Status option stores the id of the group it sits in, though it already sits inside that group; nothing reads it, and a hand edit leaving it out makes the whole property vanish.

**What Changes:** Every option gets a hidden permanent id, the way properties already do. Your pages keep holding the option's word, so your files and Obsidian read exactly as now. Views, tiles, and the graph filter point at the id, so a rename stops rewriting them, while it still rewrites the pages holding the old word. Pommora already works this way for Context tags. Collapsed groups are remembered per property, as hidden groups already are, and deleting a grouped property keeps your folder collapses. Status options stop storing their group's id. An option written by hand without an id still works and gets one the next time Pommora changes the property list. Saved view settings show option ids where they showed words, as they already show property ids.

**Your Calls:**
- [D-1] Every option carries a permanent id, pages keep the word, and NexusOS is converted once.
- [D-2] Collapsed groups are remembered per property, with NexusOS's existing ones converted.
- [D-3] Status options stop storing their group's id, stripped from NexusOS once.
- [K-1] Deleting the property a view groups by keeps which folders were collapsed.

**Behind the Scenes:**
- The machinery that rewrites views on every option rename leaves, along with about 160 lines of tests for keeping an option's popup attached through a rename.
- One builder makes the keys for hidden and collapsed groups, replacing two.
- The NexusOS conversion runs once as a throwaway script and leaves, rather than living in Pommora as a conversion on every open.
- Option ids make merging options one at a time possible for the Sync rebuild.

#### The Properties Panel, Cells, Cards, and Right-Click Menus

**Today:** Values appear in table cells, card fields, the Properties panel, pickers, filters, group headers, and right-click menus. They all draw values through one shared piece, but what happens when you click or right-click a value is copied three times, for the table, cards, and the panel, with a fourth version for the native menu, and the copies have drifted. The panel's right-click on a File value skips the Remove every other panel row offers. A Link row's name in the panel offers Clear and Remove while its value offers Edit and Rename. The two link menus word and order their rows differently ("Edit, Rename" against "Rename, Edit Title"). The text pen's spoken label reads "Open in TextPane," a code name. A Select's compact chip uses a tag icon while the Select type's own icon differs, and every user-made Status group draws a dashed circle.

**What Changes:** A value's right-click menu reads the same in the table, cards, and panel. In the panel, a Link row's name gains Edit and Rename, and a File value gains Remove, without Clear, matching cards. The two link menus share one wording and order. The pen's spoken label reads "Open In Editor."

**Your Calls:**
- [J-10] A value's right-click reads the same wherever it opens, and the panel's File value gains Remove.
- [J-3] A Link row's name gains its value's Edit and Rename.
- [J-4] The pen reads "Open In Editor."
- [J-5] A row added in the panel stays shown while it's empty, as a blank row on every other page.
- [J-6] Cards keep hiding a chip's remove button below 80% zoom.
- [J-7] Adding a File value from a card's chooser keeps its typed-path field.
- [J-8] Whether the value picker can create Status options is planning's to recommend; see *§Still Open*.
- [M-1] A Select's compact chip keeps its tag icon, and the feature document is corrected to match.
- [M-2] User-made Status groups keep the dashed circle.

**Behind the Scenes:**
- The three copies of value click-and-menu handling become one shared piece, which also replaces the native menu's separate version.
- The rules for picking a value, written once for one row and again for many, are written once, and three ways of hooking a value up to its write become one.
- Misplaced and misnamed files move or get accurate names.

#### Views: Filtering, Sorting, and Grouping

**Today:** Each type's view behavior, meaning which filter rules it offers, how it sorts, and how it groups, is decided in about fifteen separate places, and each cell looks its property up again instead of being handed it. A filter rule with an unreadable value, like letters typed into a Number filter, passes every page, so inside an "Any" group it makes the whole group match everything. A Checkbox's "is not empty" passes every page. Empty values sort by five unrelated rules depending on type. A filter's date picker uses the Nexus clock while a value's uses the column's clock.

**What Changes:** An unreadable filter value is ignored instead of matching everything, which also changes which values a new page created in that view inherits. A Checkbox's "is not empty" works. Empty values sort last for every type. A filter's date picker opens the same picker a value does, on the column's clock.

**Your Calls:**
- [K-1] An unreadable filter value is ignored, and a Checkbox's "is not empty" works.
- [K-2] Empty values sort last for every type, and dragging a row into another value's run in a sorted view keeps reassigning its value (a reading you didn't object to).
- [J-1] A filter's date picker uses the column's clock.

**Behind the Scenes:**
- A view works out each column's type and property once instead of once per cell.
- "A value as the text you see" is computed one way for filtering and sorting, replacing two slightly different versions.
- New views stop storing a redundant list of hidden properties, with the same Title-only start.
- A third type table, for view behavior, gathers each type's filter rules, sorting, and grouping and replaces about fifteen scattered decisions, after columns carry their own answers.
- Speed on large Nexuses, such as every edit re-running the whole view, is unmeasured until a benchmark Nexus is built, and updating a view in place after one edit waits on that measurement.

#### The Property Editors and Each Type's Settings

**Today:** The Properties pane in Collection Settings is where you create and configure properties and options. Each type's settings editor is built its own way, so spacing differs: hiding the Day row in a Date editor leaves an extra gap, and in the Number editor every row that can appear or disappear has lost its spacing. A Date's look is saved per view, following the Settings window's Date Format and Time Format until a view picks its own. A Link's Format sits on the property as every view's default, with a column override, and its Underline and Color sit on the property. A Number's Format, Currency, Separators, Decimals, and Fraction sit on the property, and its Number or Bar look is per view. A Checkbox's Color sits on the property, and its Checkbox or Switch look is per view. A column's right-click calls Number's look "Format," while every other type's reads "Style." The Decimals picker reads "Hidden" when unset, though cells show decimals. A fraction denominator of zero or less is saved and silently ignored. An editor whose property disappears shows "Property not found."

**What Changes:** Every type's editor shares one layout with its spacing fixed. A column's right-click calls Number's look "Style," while Link's stays "Format." A fraction denominator of zero or less is refused. An editor whose property disappears returns to the property list. The standard header's spoken "Edit icon" reads "Edit Icon," as every menu spells it.

**Your Calls:**
- [L-1] Every type's editor shares one layout with its spacing fixed.
- [L-2] Icons on every type's settings rows, as Date's have, are filed for your later settings-pane pass (I-076) rather than done here.
- [L-3] Decimals keeps reading "Hidden" when unset, and a denominator of zero or less is refused.
- [L-4] The option popup's title field and footer stay, with planning noting where they differ from the app's standard pieces.
- [I-1] The pane's layout and wording stay for your I-076 pass; only a genuinely misplaced or confusing setting moves, and none was found.
- [I-2] Each type's settings keep reaching where they reach today.
- [I-3] An unset Link Format may follow the Default Link Format setting where cohesive; planning recommends leaving it.
- [I-4] Number's look reads "Style" in a column's right-click.
- [O-5] An editor whose property disappears returns to the property list.

**Behind the Scenes:**
- Each type's available looks are stated once instead of narrowed by hand in several places.
- The five editors become per-type lists of rows drawn by one shared menu layout, so adding a row's icon later is one addition per row.
- Five near-identical ways to save a property setting become one, and the two format savers become one.
- Every change to the property list waits its turn the same way, creating a property included.
- Small duplicates in the pane's code merge, such as a near-copy of a shared hover helper and a grab-bag file of row helpers.

#### The Trash, the Archive, and Confirmations

**Today:** Every remove, clear, and delete question already lives in one place shared with the Trash and the Archive, but the counting words are split across two places, and deleting a property or option held by nothing still asks and says "stripped from 0 Items." An option's "Remove" deletes it for good, while Remove everywhere else can be undone. Every Trash entry records whether it's partial, meaning the delete couldn't record everything it touched, and nothing shows it. A taken name quietly becomes "Name (2)."

**What Changes:** An option's Remove reads Delete. Confirmations count correctly, zero included: a delete held by nothing still asks, since the property itself is destroyed, but without the "0 Items" clause. A partial Trash entry shows a small warning mark, and restoring it adds a line along the lines of "“Title” was recorded partly, so some of what it held may not come back"; usually nothing is lost, since the files the delete couldn't reach still hold their values. A Trash restore whose name was taken in the meantime tells you, "Restored “Priority” as “Priority (2)”."

**Your Calls:**
- [O-1] An option's Remove reads Delete, so Remove only names something that can be undone or restored.
- [O-2] Every confirmation counts its Items correctly, zero included, in one vocabulary from one home the Archive and the Trash share.
- [O-4] Creating a property under a taken name tells you it took a numbered name.
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

**What Changes:** Nothing; Sync's rules stay as they are while it awaits its rebuild.

**Your Calls:**
- [H-1] Sync's merge rules stay, its losses are recorded as inputs for the rebuild, and a fix lands here only where it removes a loss without a new Sync rule; changing the rules now was rejected, since it would add rules to a design about to be replaced.
- [H-2] Option ids still land for what they fix outside Sync (a reading you didn't object to).

**Behind the Scenes:**
- The test pinning the broken scrap uses a field properties don't have and is corrected.
- The test and example explaining why the property list merges one setting at a time are rewritten around the real reason, a rename racing another edit.
- The losses and the candidate fixes for each are listed for the rebuild in the decision log's Prospects.

#### Tests and Documents

**Today:** The Properties folder holds 56 test files, about 14,700 lines, beside about 8,100 lines of code. One rule is checked seventeen times across twelve files, about 31 test titles carry labels left over from old planning rounds, and a few tests pin behavior that's already gone. The Properties feature document mixes an overview with low-level mechanics, and about a dozen of its claims are false. Several Issues entries cite stale line numbers or propose moves the code rules out. The option-picker test script fails because it still expects a confirmation for clearing an option from one page, which Pommora stopped asking for on 10-19-2026.

**What Changes:** Nothing in the app; the documents you read become accurate.

**Your Calls:**
- [A-1] The Brief's rule that tests, comments, documents, and Issues entries get the same deep clean as the code.

**Behind the Scenes:**
- Each test pins one intended behavior once: duplicates collapse, test files share one way of building a sample Nexus, and planning-round labels leave their titles.
- Tests of removed or incidental behavior leave with it, such as the tests of the one-change note limit and of the option popup's rename bookkeeping.
- The feature documents' false claims are rewritten, and the Issues entries touching Properties (I-006, I-032, I-036, I-039, I-042, I-063, I-064, and I-076) are resolved or narrowed.
- Comments that only restate the code or claim constraints that don't exist go.
- The option-picker test script follows today's confirmation rule, and the scripts that look for "Open in TextPane," an option's Remove, or the Status group id follow the changes.

#### Leftover Old Code

**Today:** Pommora still carries code for reading file layouts only earlier versions of Pommora wrote: old spellings of property types, old names for two view settings, and an old way of remembering hidden groups. Every open reads the Trash, the Archive, and the homepage files looking for those spellings, and neither NexusOS nor the test Nexus holds any of them. Several shared pieces sit in the Properties folder only because Properties wrote them first, the folder mixes files that run in the background with files that draw the screen with nothing to tell them apart, and words like "value," "Remove," and "held" each mean several things.

**What Changes:** Nothing you'll see.

**Your Calls:**
- [A-4] Only NexusOS, the test Nexus, and the benchmark Nexuses need to keep reading, so code for shapes only earlier builds wrote leaves once a scan finds nothing holding them; the scan found none.

**Behind the Scenes:**
- The every-open conversion of old type spellings and view-setting names goes, along with the old hidden-group reading and the tests of file shapes no Nexus holds.
- Reading what other apps write, such as Obsidian's keys and checkbox words, stays, since that's what keeps your files readable outside Pommora.
- Shared pieces move to the folders that own them: the multi-file machinery beside the rest of Pommora's Nexus handling, the notes file's storage beside its file handling, the link display wording beside links, list ordering into the design kit, and the filter's targets into Views.
- Each concept carries one name.
- Splitting the Properties folder into background and screen halves waits on I-042's Core-wide folder proposal, so Properties isn't shaped differently from every other area or moved twice.

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
- Deleting a property creates a Trash entry in both Trash modes [N-2].
- Clearing an option and changing a format ask only past one Item, and removing a property from a Collection doesn't ask, since it can be undone.
- Renaming an option still rewrites the pages holding its word.
- Crash-recovery notes stay on the device that owes the work, since that device holds the unreached files.
- A new view shows only Title, and properties created later stay hidden in existing views.
- In a grouped view, pages with no value sit in an unlabeled run at the top or bottom, per the view's Ungrouped Top/Bottom setting.
- The remaining edge rules [P-3]:
  - Two properties or options whose names differ only by capitalization or accents read as the first, and an option duplicate leaves the file on the next option edit.
  - Re-adding a removed property doesn't bring back a value whose option was renamed or deleted in the meantime.
  - Any edit to one property tidies the other properties on the same page.
  - Select and Status values are saved as a one-item list, so Obsidian treats them as lists.
  - Checkbox properties can't group a view, and Context columns can't sort one.
  - Picking an option across several selected rows clears it when every row already holds it and sets it otherwise.
  - The one-line text field edits only a value's first line.
  - A custom option sort reads in your custom order and ignores Default and Reversed.
  - A restored Space loses an option deleted while it sat in the Trash.

#### Your Data

Four NexusOS files are converted once by a throwaway script, which then leaves:
- **Your Property List:** each of the 59 options across seven properties (Status 8, Tags 3, Brand 20, Concern 5, Scale 5, Color 12, Version 6) gains its id, and Status's eight options lose their group id.
- **The Ideas Collection's Settings File:** the "Table" view's group order, Status sort order, and collapsed groups, and the "Untitled View"'s group order and collapsed groups, switch from option words to ids. Collapsed Status groups are scoped to Status, folder collapses stay, and the lowercase "open" and "closed," which match no option, are dropped.
- **The Homepage Tiles File:** the first tile's "Active" and "Archive" views switch their Status sort orders and filters to ids.
- **The Pommora Project's Tiles File:** the third tile's "Ideas" view switches its Status sort order to ids, and its leftover Status collapses are kept and scoped to Status, with "open" and "closed" dropped.

Every other collapsed group in NexusOS holds only folders and stays as it is, and no other view, tile, graph filter, or Trash entry names an option. No page changes: pages keep the option words they hold now, and nothing in any page's file changes shape. Nothing else on disk changes shape either, since NexusOS holds no stash, no old spellings, and no crash-recovery notes to convert. Going forward, Pommora writes its one notes file only while work is owed and, if you choose the .nexus home below, small stash files when a property is removed.

#### Still Open

**Where the Stash Lives:** settled. The stash stays in the Collection's settings file, and its entries are kept for as long as the History Timeframe setting keeps page history, then cleaned out; a timeframe of its own is filed for later. The sync loss waits for the Sync rebuild [C-3].

**Morning Questions:** each gives the reading planning proceeds on.
1. **Owed Names [B-4]:** the refusal also covers a name still owed to an unfinished rename, which today quietly becomes "Priority (2)," so one rule covers both and a new property never inherits a rename's unreached pages.
2. **Notes File [B-1]:** one notes file holds every item's entry rather than a file per item, since it never syncs and keeps one read at open.
3. **Stash and the Trash [C-2]:** a page in the Trash gets its stashed value written into its Trash copy when the property is re-added.
4. **Partial Mark [N-1]:** it shows as a warning icon with a spoken label on the Trash row, plus one line on restore.
5. **Folder Layout:** part one of I-042, the Core-wide folder proposal, isn't owned by this work, and the Properties folder's split waits on it.
6. **New Views:** a new view shows Title only.
7. **Value-Less Rows:** they stay an unlabeled run rather than a "None" group.
8. **Several-Word Selects [P-1]:** settled: any edit to the page tidies a Select holding several words to the one valid option it shows, by the same logic as every other tidy-up.
9. **The Pommora Tile [D-2]:** its Status collapses are kept and scoped to Status, with "open" and "closed" dropped.
10. **The Name [F-2]:** settled: the group is named Filedata.
11. **Hand-Written Context Properties [F-1]:** one written into the property list reads as not a real property.
12. **The Link Default [I-3]:** an unset Link Format stays Full Link, since Default Link Format is set per device and governs pasting, so tying them would let one property read differently on your Mac and your iPhone.
13. **Zero-Holder Deletes [O-2]:** deleting a property or option held by nothing still asks, with correct wording.
14. **Numbered Names [O-4]:** the pane's `+`, which always names a new property "New Select" or similar and opens it for renaming, stays silent, while a Trash restore reports its numbered name.
15. **The Panel's File Menu [J-10]:** it gains Remove but not Clear.
16. **Undo and Aliases [E-3]:** undo takes back only a Link value's alias; a link typed inside a Text value adds its alias through the editor's own save, which undo leaves.
17. **Status in the Picker [J-8]:** the value picker keeps creating Select and Multi-Select options but not Status options, since a Status option has to sit in one of its groups and a quick picker would have to guess which.

#### The Size

By the Investigation's rough figures, the work removes, net, about 1,270 to 1,690 lines of code and about 1,230 to 1,600 lines of tests; the Properties folder alone holds about 8,100 lines of code and 14,700 lines of tests, and the cuts reach other folders too. Roughly half comes from cleanup that needs no call and half from your decided directions, led by the shared value piece, the view-behavior table, the editors, and the notes file. The few additions, such as the notes file's entries, option ids, the Trash mark, the damaged-list handling, and the restore's numbered-name notice, are each small and sit inside areas that shrink overall. The old-code and small-fold figures are read from the code and hold within a few lines; the larger ones are estimates of designs not yet drawn that could move by half, and nothing is measured yet, since no benchmark Nexus is built.
