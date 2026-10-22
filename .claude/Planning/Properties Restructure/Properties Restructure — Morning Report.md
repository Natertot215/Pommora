## Properties Restructure — Morning Report

**DATE:** 10-22-2026
**STATUS:** The plan is complete and awaits ratification.

### What the Plan Is

The Properties Restructure is a top-to-bottom cleanup of how Pommora handles properties, the fields like Status, Tags, Due Date, or Priority that pages and Spaces carry. Properties grew across many sessions, and most of how they work behind the scenes reflects what earlier agents judged appropriate rather than what you asked for. The same job is often done several ways, old code lingers for file layouts no Nexus still holds, and a handful of real bugs sit in the gaps. The work covers everything whose job is properties, wherever it lives in Pommora [A-2], treats the finished Archive work as current ground truth [A-3], and answers to the Brief's approach and principles [A-1].

Most of it changes nothing you'll see. Where something does change, it's either a decision you made during the brainstorm (cited as [B-1], [J-10], and so on, from *Properties Restructure — Decisions & Intention*) or a reading planning took in your place, a Last Call (cited as [LC-#]) waiting for your ruling below.

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

**How It Runs:** one agent per phase applies each step with the plan-replay tool, finishes what the tool can't, and proves the phase with the type check, tests, lint, and a click-through drive of the app. Two reviewers read Phases 6, 8, 11B, 12, 16B, and 17, the phases that rewrite your data, rebuild crash recovery, or change a shared surface. A neutral check runs after Phase 12 and at the end, and one final review covers everything.

**When It's Done:** Pommora has about 838 fewer lines of production code, each property type's facts live in one place, every value change reaches its file one way, every big multi-file change can be finished with one Try Again, options have permanent ids, and the documents describing all of it are accurate.

### What I Need From You

Reply in chat. The simplest answer is a sentence like "approve the rest as recommended, except LC-x", followed by what you want instead for each exception. The groups run from the calls that most need you to the ones that need nothing.

#### Against Something You Confirmed

These four depart from a decision you confirmed. Each needs your yes or your original back.

- **LC-58 · Clearing an Option Warns Without Try Again [B-1]:** you confirmed that every change rewriting many files writes a crash-recovery note. The plan keeps Clear without one: if a Clear misses some pages, it warns, as it does today, and offers no Try Again. A note would let Try Again run the Clear later, and by then you may have picked that option again on a page the Clear never reached, so the late Clear would wipe your new pick. Running Clear again reaches the missed pages safely. **Recommended:** keep it. **If You Hold to B-1:** Clear writes a note and offers Try Again, and that Try Again can erase a pick you made in between.
- **LC-63 · A Change Under an Owed Rename Reads as Done [B-3]:** you confirmed that a delete which can't reach every page finishes what it can and offers Try Again for the rest. While a property's or Context's rename is still owed, the plan has a later option rename, option delete, Remove, or Space rename or delete update every page already under the new name and report success. The pages still under the old name catch up when the rename itself finishes, through its own Try Again or the next open. Those pages are the ones the rename's notice already counted and offered Try Again for, and counting which of them hold this change's word would mean reading files the rename couldn't read. **Recommended:** keep it. **If You Hold to B-3:** each such change reports a count of the pages waiting on the rename, about 15 more lines.
- **LC-14 · Numbered Names Speak Only on a Trash Restore [O-4]:** you confirmed that creating a property under a taken name tells you it took a numbered name. The plan tells you when a Trash restore lands under a numbered name ("Restored “Priority” as “Priority (2)”."), while the pane's `+` keeps naming new properties "New Select" or similar without a notice, since it picks the name itself and you haven't asked for a name it could refuse. **Recommended:** keep it. **If You Hold to O-4:** the `+` also shows a notice whenever it numbers its own default name.
- **LC-47 · The Two Link Menus Read the Same, With One Word Apart [J-10]:** you confirmed that a value's right-click reads the same wherever it opens. Both link menus now read Rename, then Edit Link, in the order the connection menu already uses. On a page link in the Properties panel, though, the row label's item reads Edit Link while the value's own menu reads Edit Title for the same action, since that menu edits the linked page's title. **Recommended:** keep it. **If You Hold to J-10:** one of the two words is chosen for both menus.

#### Open Calls

These have no recommendation strong enough to take in your place.

- **NC-1 · Context and Space Deletes in System Trash Mode Keep No Record of Their Tags:** in System Trash mode the folder goes to the system Trash and its tags leave every page with no copy anywhere, while a property delete keeps a Pommora Trash entry in either mode, because you chose that [N-2]. **Recommended:** leave it; System Trash mode means Pommora keeps no records of its own, and the property exception is yours.
- **NC-2 · Damaged-File Copies Are Never Cleaned:** when Pommora rebuilds one of its own damaged settings files, it sets the damaged copy aside beside it and never removes it. This is the rule for every Pommora settings file, outside Properties too. **Recommended:** leave it; the copies are evidence for a hand repair, and a cleanup rule belongs to all of Pommora's files at once.
- **NC-3 · Pages Pommora Can't Safely Rewrite Count as Unfinished Only for Remove:** a Remove counts such a page as unfinished, with Try Again (LC-19), but a rename, a delete, an option change, and Context and Space changes still count only files they couldn't read, so after one of those, such a page keeps the old name with nothing owed, as today. **Recommended:** decide whether every change should count them; widening it is a behavior change the plan doesn't make on its own.
- **"Date" or "Date & Time":** the plan, and the app today, name the type "Date", while Pommora's CLAUDE.md says "Date & Time". Say which name stands.

No Last Call is close enough to sit here; each has a clear recommendation below.

#### Behavior Changes to Approve

Each changes something you'd see or something written in your files. Approving them as recommended is the default.

##### Crash Recovery and Big Changes

- **LC-6 · One Try Again Finishes Everything Owed:** when a new name is refused because something else still owes it, Pommora knows the name but not which item owes it, so Try Again finishes every owed item at once and reports one combined count. Unfinished work is rare, so finishing all of it is harmless. **Recommended:** take it.
- **LC-7 · A Name Still Owed to an Unfinished Rename Is Refused:** today a new property named after an unfinished rename's old name quietly becomes "Priority (2)", and renaming a property onto such a name isn't checked at all. Both are refused with "An earlier change hasn't reached every file yet." and Try Again, as your B-4 does for a deleted name, so a new property never inherits pages a rename hasn't reached. This covers creating, renaming, and changing the Label Format. **Recommended:** refuse.
- **LC-8 · The Same Rule for Contexts and Spaces:** a Context or Space created or renamed under a title another item still owes takes over that item's leftover tags today. It's refused the same way. **Recommended:** refuse.
- **LC-9 · A Trash Restore Under Someone Else's Owed Name Is Refused Too:** restoring goes through the same create step, so it's refused with the same message, and Try Again finishes the other item's work first, after which the restore can run. **Recommended:** take it.
- **LC-10 · A Delete That Finishes Later Still Saves Every Value to the Trash:** today a property delete that couldn't reach some pages loses those pages' values from its Trash entry when it finishes them later. Every delete records the values up front from Pommora's index, so a restore brings them all back. **Recommended:** take it.
- **LC-12 · A Change Whose Note Can't Be Written Doesn't Start:** today some big changes run without a note when the note can't be written, and others refuse. Every one refuses, with nothing changed. **Recommended:** refuse.
- **LC-18 · Re-Adding a Removed Property Cancels What Its Remove Still Owed There:** if a Remove missed pages and you add the property back to that Collection before Try Again runs, the leftover work is dropped for that Collection, since the property governs those pages again. **Recommended:** take it.
- **LC-19 · A Remove Reports Pages It Can't Clean Up:** today a Remove quietly leaves the value on a page with no ID, a page sharing another page's ID, or a page whose properties can't be rewritten safely, while the Collection no longer uses the property. These count as unfinished, with Try Again; a page without an ID usually gets one at its next read, so Try Again usually succeeds. **Recommended:** take it.
- **LC-28 · The Notes File Stays Behind Empty:** after the first big change, the hidden `.nexus/.owed.json` stays on disk holding nothing (`{}`), because deleting it safely would rebuild the very file-locking piece this work removes. It's hidden, never synced, and harmless. **Recommended:** accept it.
- **LC-45 · Clearing an Option Is No Longer Refused While Another Option Change Is Owed:** today Clear waits on its own property's unfinished option change. It runs, and any old names still owed to that option switch to "remove", so the unfinished rename can't bring the cleared value back. **Recommended:** take it.
- **LC-49 · A Retried Context Rename Can Leave Leftovers Mid-Plan:** between Phase 1 and the crash-recovery rebuild in Phase 11A, if a Context or Space rename's Try Again misses files a second time and no earlier record of that rename is still on file, nothing records the leftover files, so they keep the old name until renamed again. Every other retry behaves as today, and Phase 11A gives each item its own note. **Recommended:** accept it for those phases; keeping the old field alive to cover it would be code Phase 11A deletes.
- **LC-50 · Re-Choosing the Open Nexus Doesn't Retry an Owed Context Rename:** today picking the Nexus that's already open re-runs an unfinished Context rename. It happens only on a real open, as unfinished property work already does, and the rename's notice keeps its Try Again. **Recommended:** take it.
- **LC-57 · A Notes File Damaged Before Pommora Read It Starts Fresh:** if `.nexus/.owed.json` is damaged before Pommora reads it, its unfinished work reads as none, and the next note sets the damaged copy aside and starts a new file, as every Pommora settings file does (NC-2). The leftover files keep their old names until changed again. **Recommended:** accept it; the file stays on one device, and only an outside edit damages it.
- **LC-64 · A Stranded Context Rename Offers Try Again:** if a Context rename's folder can't move and putting the old name back fails too, the new name is already in the Context list, so the rename reports "Couldn’t update 1 Item." with Try Again, which moves the folder and updates the pages. Today it answers with the folder's error and leaves the work for the next open. **Recommended:** take it.

##### Values and Tidy-Ups

- **LC-20 · Outside-Written Several-Word Selects Are Tidied at the Next Open:** with your tidy rule and Repair Properties On Open both on, a Select or Status that Obsidian or another app wrote with several words becomes the one option Pommora shows the next time the Nexus opens, and that change syncs. NexusOS has none today, and Phase 4B lists any it finds before changing them. **Recommended:** take it; it's what your two rulings say together.
- **LC-21 · "Any Edit" Means Any Value Edit:** a several-word Select tidies when any property, tag, or Space link on its page changes, and at Repair On Open, the same moments every other tidy-up happens. Editing the page's text, title, or banner doesn't tidy. **Recommended:** take it.
- **LC-22 · A Multi-Select Holding Unknown Words Also Collapses Duplicates:** today `[a, zeta, a]` stays as written when another property is edited, while picking that Multi-Select writes `[a, zeta]`. It becomes `[a, zeta]` either way, with its options ahead of the words no option names, as a pick writes them. NexusOS holds no such value, and Phase 4B stops for your call if one appears. **Recommended:** one rule.
- **LC-23 · A File Value Listed Twice Collapses:** every other list type drops a repeated item on the next edit; File didn't. **Recommended:** match the others.
- **LC-24 · Spaces-Only Reads as Empty for Dates, Links, and Files Too:** you ruled spaces-only text empty; a date, link, or file written as only spaces read as filled for the same reason. It's stated once for every type. **Recommended:** take it.
- **LC-25 · An Edit That Changes Nothing Leaves the File Alone:** today re-picking a value a Space already holds rewrites its settings file and gives it a new modified time. It writes nothing, as pages already do, and undoing a change that changed nothing writes nothing either. **Recommended:** take it.
- **LC-51 · A Pick of an Option Deleted Meanwhile Writes Nothing:** if a picker is open while another device deletes one of its options, or a new page inherits an option a sync just removed, picking it writes nothing for that option instead of writing the deleted word, which a Multi-Select would then re-adopt as a brand-new option. **Recommended:** take it.
- **LC-52 · A Title Sorts and Filters on the Text It Shows:** a page title holding `[[…]]` or `](…)` sorts and filters on the text it displays, as a Text value already does, where it sorted on the raw file name. A file name seldom holds either. **Recommended:** take it.
- **LC-61 · A Hand-Copied Option Keeps Its Place:** if you or an agent copy an option in `properties.json` by hand, give the copy a new name, and leave its id, both options stay: the copy takes an id derived from its own name, and pages holding its word keep reading it. A plain "each id once" rule would drop the copy on every read, and the next option edit would erase it from the list, where today it stays. **Recommended:** take it; it keeps what today keeps.
- **LC-62 · A Status Glyph Follows Its Option's Id:** while you type a new name in the option editor, the Status chip keeps its group's icon, where today it falls back to the default icon until the rename is saved. An accident fixed. **Recommended:** take it.

##### The Stash and the Trash

- **LC-1 · Each Stash Block Records Its Removal Date:** each removed property's stash gains the day it was removed, so the stash can age out, and that date sits beside the values inside the existing wrapper. **Recommended:** keep the wrapper; flattening would put the date where a page's id belongs.
- **LC-2 · Deleting a Property Everywhere Leaves Collections in the Trash Alone:** reaching into a trashed Collection's settings without also touching its pages would make restoring both lose the link between them. Every delete already leaves the Trash alone, and restoring in either order works: the Collection comes back still listing the property, and the property's restore switches it back on. **Recommended:** leave the Trash alone.
- **LC-3 · "Cache" Becomes "Stash" Everywhere, on Disk Too:** everyone calls it the stash, while the code and the settings file say "cache" for something that can't be rebuilt. No Nexus holds a stash yet, so renaming the file key to `property_stash` costs nothing, and renaming the code alone would give one thing two names. **Recommended:** rename both.
- **LC-4 · A Restored Collection Can Keep a Deleted Property's Id:** if a property is deleted while its Collection sits in the Trash, the restored Collection still lists the property's id. It does nothing on its own, and it switches the property back on if the property is restored too. **Recommended:** leave it.
- **LC-5 · A Re-Add That Couldn't Refill Some Pages Offers Try Again:** today, if re-adding a property can't write some pages, their values wait in the stash and you're never told. With the stash aging out, they'd be lost unseen, so the re-add reports them with Try Again, which refills from the stash. Restoring a deleted property from the Trash re-adds it the same way. **Recommended:** report it.
- **LC-26 · How the Stash's Clock Runs:** a property restored from the Trash keeps its stash's original removal date, as page history ages trashed pages; a second Remove into the same block restarts that block's clock; archived pages' stash values follow History Timeframe rather than Archive History Timeframe, as your C-3 says. **Recommended:** take all three.
- **LC-36 · A Page in the Trash Gets Its Stashed Value:** re-adding a property writes a trashed page's stashed value into its Trash copy, so restoring the page brings it back. Only a page trashed from this Collection qualifies. **Recommended:** take it.
- **LC-37 · The Partial Mark:** a partly recorded Trash entry shows a warning mark spoken as "Recorded Partly", and restoring it adds "“Title” was recorded partly, so some of what it held may not come back." **Recommended:** take it.
- **LC-46 · An Archive Restore's Notice Keeps Its Try Again:** restoring from the Archive shows its "some values didn't come back" lines once, inside the Restored notice, which replaces the earlier notice in the same moment. What that replacement loses is the earlier notice's Try Again, so the Restored notice carries it whenever work is still owed. **Recommended:** take it.

##### Views, Menus, Pickers, and Editors

- **LC-11 · A Hand-Written Context Property Isn't a Real Property:** a Context-typed or timestamp property typed into the property list by hand is set aside when the list is read, since Contexts come from the Context list. **Recommended:** take it.
- **LC-13 · Deleting Something Nothing Holds Still Asks:** deleting a property or option no page holds still asks, since the definition itself is destroyed, without the "stripped from 0 Items" clause: "It is removed from every collection; a restorable record lands in the nexus’s .trash folder." for a property, and "The option is deleted from the property." for an option. **Recommended:** take it.
- **LC-15 · The Panel's File Menu:** a File value's right-click in the panel gains Remove and not Clear, matching cards. The row's label opens the same menu as its value, so a File row's label loses its Clear and gains Add File. **Recommended:** take it.
- **LC-16 · Undo and Aliases:** undo takes back a Link value's alias, while a link typed inside a Text value keeps the alias its save added. **Recommended:** take it.
- **LC-40 · The Pommora Tile's Collapses:** its leftover Status collapses are kept and scoped to Status, with "open" and "closed", which match no option, dropped (see *§Your Data*). **Recommended:** take it.
- **LC-48 · Accidents Fixed Along the Way:** a Nexus whose unfinished Context rename throws on open finishes opening; a property delete that can't update a damaged Collection settings file stays unfinished with Try Again instead of silently skipping it; the restores' ignored Space-file failures warn; a returning page the restore can't tidy no longer refuses the whole restore, it lands and the warning names it; a page restored into the Trash takes a re-filled link value as a live page does; a value picked from a menu after its property was deleted does nothing instead of opening a picker on a made-up property; a write for a property deleted a moment earlier reaches the app's own refusal instead of vanishing; a hand-written filter rule its type can't answer, such as Greater Than on a Checkbox, sits out instead of matching every page; a Link added from a card's Add list opens empty; an open picker closes when its row disappears, and a pane opened from the sidebar's menu closes if that row is redrawn; and a Control-click in the panel opens only the menu, as in the table and cards. **Recommended:** take all of them.
- **LC-53 · A Checkbox Keeps Both of Its Readings:** an unchecked box is stored as no value, so "is empty" matches unchecked boxes, while sorting treats it as a value, ascending putting unchecked first. Applying "empty sorts last" to it would put every unchecked page last both ways and make the sort's direction do nothing. **Recommended:** keep both; it's the one exception to empty-last.
- **LC-54 · Pickers Open Fresh per Value Everywhere:** the table already opens a fresh picker when you move from one value to another; Cards and the Properties panel do the same, a Date or File added from a card's Add list opens as a fresh picker at the same spot, and the panel's popover fades out instead of vanishing. **Recommended:** take it.
- **LC-55 · The Date Editor's Rows Space at 8px:** with every type's editor on one layout, the Date editor's rows space at 8px where they spaced at 4px, the Number editor's revealed rows gain their missing 8px, and a hidden Day row leaves no gap. **Recommended:** take it; it's what "every editor shares one layout" [L-1] means.
- **LC-56 · Sweeps Reach Only the Spaces Pommora Lists:** finding which Spaces hold a property or tag reads Pommora's own list of Spaces instead of scanning every folder, so a Space folder under a Context the Context list doesn't name (only a hand copy makes one) is no longer rewritten, a Space sharing another's id is held out as pages already are, and an unreadable Space file counts as owed. **Recommended:** take it.
- **LC-59 · A Date Picked Into Another Group Closes Its Calendar:** in a view grouped by a Date, picking a date that moves the page into another group closes the calendar, because the row it opened from is redrawn under its new group. Today the calendar stays open but loses its place on screen. **Recommended:** take it.
- **LC-60 · An Editor That Gave Way Reopens If Its Property Returns:** when a property's editor gives way to the list because the property left [O-5], the pane remembers it, so if the property comes back before you open anything else (an undo, a sync, or re-adding it), its editor slides open again. A Remove or Delete made from this pane forgets it. **Recommended:** take it; the same rule lets a just-created property's editor open the moment the property exists.

#### Already Settled or Invisible

These record your earlier answers or change nothing you see. Nothing needs doing.

- **LC-17 · Status in the Picker:** the value picker keeps creating Select and Multi-Select options but not Status options, since a Status option has to sit in one of its groups; your J-8 left this to planning.
- **LC-27 · The History Timeframe's Hint:** it describes only file history while it also ages the stash; its wording waits for your I-076 and I-077 passes.
- **LC-29 · The Notes File Uses Pommora's Usual File Writer:** the same piece every other Pommora settings file uses.
- **LC-30 · A Mis-Capitalized Option Word Beside a Valid One Drops:** `Stage: [done, Active]`, with the option spelled "Done", tidies to `[Active]` by your rule that unknown words are ignored; `[done]` alone stays as written.
- **LC-31 · Sync's Tests Stay:** Sync's folder isn't touched while Sync awaits its rebuild; only its feature document's example is rewritten.
- **LC-32 · The Properties Folder's Background/Screen Split Waits:** it's part of I-042's folder plan for all of Pommora.
- **LC-33 · One Notes File:** one file holds every item's entry, since it never syncs and keeps one read at open.
- **LC-34 · Every Property Change Goes Through the App's One Change Channel:** five ways to save a property setting become one.
- **LC-35 · I-035 Stays Open:** pages tagged with a new Space or Context name stay unlinked until re-read; the entry's wording is updated.
- **LC-38 · New Views:** a new view shows Title only, and properties created later stay hidden in existing views, as today.
- **LC-39 · Value-Less Rows:** in a grouped view, pages with no value stay an unlabeled run at the top or bottom, as today.
- **LC-41 · The Link Default:** an unset Link Format stays Full Link [I-3].
- **LC-42 · Several-Word Selects:** your answer: any edit tidies to the one option shown.
- **LC-43 · The Name:** your answer: Filedata.
- **LC-44 · Measurement Outcomes:** four speed checks on a large test Nexus decide small things by fixed rules; any that fails its threshold comes back to you with its numbers.

#### Ratify

Ratify or redirect *Properties Restructure — Decisions & Intention* and *Properties Restructure — Implementation Plan*.

### Where It Stands

- **The Plan:** 21 phases and 140 tasks. Every code change applies mechanically: the replay tool applies 2,400 changes with no mismatches and skips 7 that land only if a speed measurement fails.
- **The Numbers:** about −838 production lines if every speed measurement passes; about −771 if F3 fails, and about −715 if all three fail. The count stays below zero after every phase, closest at about −83 after Phase 12 if F3 fails. Seven phases add lines (P4B, P6, P10, P11A, P11B, and P12, plus P15 only if its speed check fails), each because it lands a ruling or a repair no existing code performs; *Planning Findings › §The Ledger* gives each one's reason.
- **The Reviews:** two reviewers raised 114 findings; 103 were applied, 5 rejected with reasons, 5 became Last Calls, and 1 was replaced by a different fix. Replaying the plan in order then found 48 defects that would have broken a phase, such as a removed import still in use, and two correction passes fixed them.
- **The Dry Run:** the whole plan was applied in a throwaway copy and type-checked at every phase end. Phase 1 compiles clean; from Phase 2 on, each phase end shows new errors, about 120 in app code and more in tests, mostly from steps the plan states in words, like rewriting a test. Execution fixes these in the real code, where each phase's checks prove the fix, so the rule that every phase leaves a working state is true at execution rather than on paper.

### The Walkthrough

How each area works today, what you'll notice, the decisions it rests on, and the cleanup that needs no call.

#### Properties and Their Types

**Today:** Pommora keeps one list of types that does two jobs: what a property can be, and what kind of column a view can show. Because of that, Created Time, Last Modified, and in places Title ride along as if they were property types, and guards across the app keep them from being treated as real ones; one written into the property list by hand shows up as a dead or uneditable property. Neither timestamp is stored: Created Time is read from the moment encoded in the page's ID, and Last Modified from the file itself. A page's Icon is already neither a property nor a column; it lives in Pommora's page-info files beside the page's aliases. Each type's facts, such as its name, its icon, how it sorts, whether it can group a view, and which editor opens, are scattered across many tables and one-off checks.

**What Changes:** The property types become the nine you can create plus Context. Title, Created Time, Last Modified, and Location form their own group, Filedata, with one table holding their names and icons. Also: LC-11, LC-52.

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
- A value holding only spaces reads as empty for every type, in cells, in "is empty" filters, and in sorting (LC-24).
- Clearing a property a Space doesn't hold tidies its other properties, as a page already does, and a write that changes nothing writes nothing (LC-25).
- A Select or Status holding several words is written as the one option it shows whenever any value on its page changes, or at Repair On Open; one naming no option stays as written (LC-20, LC-21, LC-30).
- Also: LC-22, LC-23.

**Your Calls:**
- [J-1] Text holding only spaces counts as empty on every surface.
- [J-9] Clearing a property a page or Space doesn't hold tidies the holder's other properties on both.
- [J-2] Unchecking a checkbox keeps removing its key from the file.
- [P-1] A Select or Status holding several words ignores the ones no option names, shows the valid one written latest, and tidies to that one option on the next value edit.
- [P-2] Picking a Select drops unrecognized words, a Multi-Select pick keeps them after the picked options, and a Context pick drops Space names Pommora can't find, as today.
- [A-5] A Multi-Select keeps registering words added outside Pommora as its options.

**Behind the Scenes:**
- One module owns landing a value in a file, so each edit reads the file once, and the hand-made copies of the same tidying step become one.
- A check that refuses value shapes no path can produce goes.
- Tests stop writing values a way the app never does and share one way of building a sample Nexus.
- Files named "value" that mean different things get names saying what they hold.
- The property list is reused from memory while its file is unchanged, and creating a page with starting values writes it once instead of once per Context.
- Title stops posing as a Select value internally and reads as plain text.

#### Undo

**Today:** The screen keeps undo's memory: it notes what it last read of the page before the change, and undo sends that back. That's close to the file but not exact. A property written bare (just `Status:` with nothing after it) comes back as `Status: null`. Undoing a Context pick on a tag naming a Space Pommora can't find, such as an Obsidian typo, deletes the unknown names. A second edit made before the screen catches up can make undo send back the screen's guess. Giving a Link value a new display name also gives the linked page that alias, and undo leaves the alias behind.

**What Changes:** Undo puts back exactly what the file held. The part of Pommora that writes the file notes what the edited property said just before the change and hands that note back, and undo restores it for that one property only, leaving the tidy-ups to other properties in place. A bare `Status:` comes back bare, unknown tag names survive, and undoing a Link value also takes back the alias it added without touching an alias the page already had. Also: LC-16, LC-25.

**Your Calls:**
- [E-1] Undo puts back what the file held, recorded by the part of Pommora that writes the file.
- [E-2] Undo puts back only the edited property.
- [E-3] Undoing a Link value also takes back the alias it added.

**Behind the Scenes:**
- Two undo routes and two ways of putting text back become one each, shared with the put-back multi-file changes already use.
- The screen stops working out the encoded value itself while a write is in flight and shows the pick, once a speed check on a large test Nexus confirms that costs nothing.
- The screen's undo list stays the one owner of undo order and depth, cleared on a Nexus switch as today.

#### Crash Recovery and Big Multi-File Changes

**Today:** Some changes rewrite many files: renaming a property or changing its Label Format, deleting it, and renaming or deleting an option. Before starting one, Pommora writes a crash-recovery note in the Nexus's hidden settings folder (.nexus) saying what it's about to do, so it can finish after a crash or a file it can't reach, like an iCloud file that isn't downloaded. There are exactly two notes, one shared by every property and one shared by every Context and Space, each with room for one change and each kept on its own device. Rename Priority to Urgency while two pages sit in iCloud, and the note holds the rename while you see "Couldn't update 2 Items" with Try Again. Rename Status to Stage before those pages arrive, and the note is already full, so the Status rename runs unprotected; a crash halfway leaves pages split between `Status:` and `Stage:` with nothing able to finish it. Meanwhile, any option rename, Value Format change, or option delete anywhere is refused with "An earlier change hasn't reached every file yet." A property delete updates the property list last instead of first. Context and Space deletes write no note, and if any page can't be reached they put everything back and refuse. Try Again works four different ways, while removing a property from a Collection or clearing an option offers none. A new property named Priority while the rename is owed quietly becomes "Priority (2)," and one named after a deleted property whose cleanup is unfinished takes the name, ends that cleanup, and inherits the values left on the pages it never reached.

**What Changes:**
- Every property, Context, and Space keeps its own entry in one hidden notes file, `.nexus/.owed.json`, so Priority's unfinished rename never touches Status (LC-33, LC-28).
- Every big change updates the property or Context list first and the files second. A Context or Space delete that misses pages finishes what it can and offers Try Again, as a property delete already does (LC-10).
- A Remove that missed pages returns you to the property list and offers Try Again (LC-18, LC-19).
- Option renames, format changes, and option deletes stop being refused because some other property owes work.
- Also: LC-6, LC-7, LC-8, LC-9, LC-12, LC-45, LC-58, LC-63, LC-64.

**Your Calls:**
- [B-1] Every property, Context, and Space keeps its own note; dropping the notes was rejected, since nothing could finish a change the app quit during.
- [B-2] The list changes first and the files second, as a property rename already does.
- [B-3] A delete that can't reach every page finishes what it can and offers Try Again, for properties, Contexts, and Spaces alike.
- [B-4] A new property reusing a deleted property's still-owed name is refused, and its Try Again finishes the cleanup; a numbered name was rejected, since it would sidestep the cleanup.

**Behind the Scenes:**
- The separate note systems for properties and for Contexts become one (LC-29), and the hand-placed guards built around the one-change limit leave.
- Every many-file change runs on one runner.
- Opening a Nexus finishes owed work at one point instead of two, after Pommora's page index is ready rather than before (LC-48, LC-50).
- A Context rename's backwards undo-everything path leaves, since a failed list update happens before any file moves.
- Deleting a property list-first closes a gap where an edit could land on a page just after its value was stripped.
- A field in the Context note that's written and never read goes.

#### Where a Change Reaches

**Today:** To change a property or tag across the Nexus, Pommora first finds the files that hold it. For pages, it asks its index, a quick-lookup record of every page's values. For Spaces, it opens every Space's settings file on disk every time, though it already holds them all in memory. Context changes find pages a third way that skips the "only inside Collections" filter, so a Context rename reaches loose pages outside every Collection, like NexusOS's quick-filter page in the Agenda folder, while a property rename doesn't; nobody ever stated that as a rule. Four Trash and restore routines write Space files with their own loops, and two of them ignore a failed write. On every open, Pommora also re-reads every page in every Collection with a Multi-Select, to register words added while it was closed.

**What Changes:** A restore that couldn't update a Space's file or a returning page tells you with a warning, and the restore still completes (LC-48). Also: LC-56. Otherwise, nothing you'll see.

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
- Re-adding a property drops stash entries for pages that left the Collection (LC-36).
- Stash entries are cleaned out once they're older than the History Timeframe setting (LC-1, LC-26).
- Also: LC-2, LC-3, LC-4, LC-5.

**Your Calls:**
- [C-1] Remove keeps moving values off the pages and into the stash; retiring the stash was rejected, since it would leave hidden values on pages, which you ruled out in July.
- [C-2] The stash loses nothing under sync, drops entries for pages that left, and lets a missed Remove be retried.
- [C-3] The stash stays in the Collection's settings file, kept for the History Timeframe; a timeframe of its own is filed as I-077.
- [H-2] The stash's sync loss waits for the Sync rebuild.

**Behind the Scenes:**
- Restoring a deleted property from the Trash writes its stash back before re-adding the property, so the values actually refill.
- Also: LC-27, LC-48.

#### Options and Saved Views

**Today:** Options, the choices in a Select, Multi-Select, or Status, have no permanent identity; they're known by their word. Saved views remember options by word too, in a custom sort order, a group order, hidden and collapsed groups, and a filter's values, so renaming an option rewrites every view, tile, and graph filter that mentions it, and on two devices a rename can race a view edit and leave a filter that silently stops matching. Collapsed groups are remembered by bare name: collapsing "Done" under Status also collapses a "Done" under any property you later group by, and a collapsed month collapses under every date property. Deleting the property a view groups by also forgets which folder groups you'd collapsed. Each Status option stores the id of the group it sits in, though it already sits inside that group; nothing reads it, and a hand edit leaving it out makes the whole property vanish.

**What Changes:** Every option gets a hidden permanent id, the way properties already do. Your pages keep holding the option's word, so your files and Obsidian read exactly as now. Views, tiles, the graph filter, and preview rules point at the id, so a rename stops rewriting them, while it still rewrites the pages holding the old word. Pommora already works this way for Context tags. Collapsed groups are remembered per property, as hidden groups already are, and deleting a grouped property keeps your folder collapses. Status options stop storing their group's id, and one written by hand without it reads. An option written by hand without an id still works and gets one the next time Pommora changes the property list. Saved view settings show option ids where they showed words, as they already show property ids. Also: LC-51, LC-61, LC-62.

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
- In the panel, a Link row's name gains Rename and Edit Link.
- The pen's spoken label reads "Open In Editor."
- Also: LC-15, LC-17, LC-47, LC-48, LC-54, LC-59.

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
- An unreadable filter value is ignored instead of matching everything, which also changes which values a new page created in that view inherits (LC-48).
- A Checkbox's "is not empty" works.
- Empty values sort last in either direction for every type except Checkbox (LC-53).
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
- Speed checks on a large test Nexus decide whether views need updating in place after an edit and whether the graph filter needs a cache (LC-44).

#### The Property Editors and Each Type's Settings

**Today:** The Properties pane in Collection Settings is where you create and configure properties and options. Each type's settings editor is built its own way, so spacing differs: hiding the Day row in a Date editor leaves an extra gap, and in the Number editor every row that can appear or disappear has lost its spacing. A Date's look is saved per view, following the Settings window's Date Format and Time Format until a view picks its own. A Link's Format sits on the property as every view's default, with a column override, and its Underline and Color sit on the property. A Number's Format, Currency, Separators, Decimals, and Fraction sit on the property, and its Number or Bar look is per view. A Checkbox's Color sits on the property, and its Checkbox or Switch look is per view. A column's right-click calls Number's look "Format," while every other type's reads "Style." The Decimals picker reads "Hidden" when unset, though cells show decimals. A fraction denominator of zero or less is saved and silently ignored. An editor whose property disappears shows "Property not found."

**What Changes:**
- Every type's editor shares one layout (LC-55).
- A column's right-click calls Number's look "Style," while Link's stays "Format."
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
- [I-4] Number's look reads "Style" in a column's right-click.
- [O-5] An editor whose property disappears returns to the property list.

**Behind the Scenes:**
- Each type's available looks are stated once instead of narrowed by hand in several places.
- The five editors become per-type lists of rows in one file, drawn by one shared layout, so adding a row's icon later is one addition per row.
- Every change to the property list waits its turn the same way, creating a property and reordering one included.
- Also: LC-34.
- The pane's drag model moves into the design kit, and small duplicates in the pane's code merge.

#### The Trash, the Archive, and Confirmations

**Today:** Every remove, clear, and delete question already lives in one place shared with the Trash and the Archive, but the counting words are split across two places, and deleting a property or option held by nothing still asks and says "stripped from 0 Items." An option's "Remove" deletes it for good, while Remove everywhere else can be undone. Every Trash entry records whether it's partial, meaning the delete couldn't record everything it touched, and nothing shows it. A taken name quietly becomes "Name (2)."

**What Changes:** An option's Remove reads Delete. Confirmations count correctly, zero included. Also: LC-13, LC-14, LC-37, LC-46.

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

**What Changes:** Nothing; Sync's rules and tests stay as they are while it awaits its rebuild (LC-31).

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
- The feature documents' false claims are rewritten, and the Issues entries touching Properties (I-006, I-032, I-035, I-036, I-039, I-042, I-061, I-062, I-063, I-064, I-076, and I-077) are resolved or narrowed (LC-35).
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
- Also: LC-32.

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
- New views and value-less rows behave as today (LC-38, LC-39).
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

Every other collapsed group in NexusOS holds only folders and stays as it is, and no other view, tile, graph filter, or Trash entry names an option. No page changes: pages keep the option words they hold now, and nothing in any page's file changes shape. Nothing else on disk changes shape either, since NexusOS holds no stash, no old spellings, and no crash-recovery notes to convert. Going forward, Pommora keeps its one hidden notes file, `.nexus/.owed.json`, on each device, holding nothing once no work is owed.

### Good to Know

- **The Issues Renumbering:** when Phase 18 closes three entries, the index script renumbers the rest, so I-076 and I-077 become I-073 and I-074.
- **Speed Checks:** a speed check that fails its threshold comes back to you as a call with its numbers, never as a new Issue.
- **`reveal-parity`:** one older test script looks for a page `~/Test` doesn't hold; it sits outside Properties and stays as it is.
