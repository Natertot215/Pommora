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

- **LC-58 · Clearing an Option Warns Without a Try Again (No Visible Change):**
  - **Today:** Clear removes an option's value from every page that holds it; if it misses some pages, it warns you and offers no Try Again button.
  - **After:** No change, although you confirmed [B-1] that every change rewriting many files writes a crash-recovery note.
  - **Alternative:** Clear writes a crash-recovery note and offers Try Again, as B-1 says, but a late Try Again could wipe an option you picked again in the meantime on a page the Clear missed.
  - **Recommendation:** Keep Clear warning without a Try Again, and run Clear again yourself to reach the missed pages; a second Clear is safe, while a late Try Again could erase a newer pick.
- **LC-63 · A Change Made While a Rename Is Unfinished Reports Success (Change):**
  - **Today:** This case wasn't traced in the code for this report, so what happens today isn't established.
  - **After:** While a property's or Context's rename still hasn't reached every page, a later option rename, option delete, Remove, or Space rename or delete updates every page already under the new name and reports success. The pages still under the old name catch up when the rename finishes, through its own Try Again or the next open, though you confirmed [B-3] that a change which can't reach every page offers Try Again for the rest.
  - **Alternative:** Each such change also reports how many pages are waiting on the rename, which takes about 15 more lines of code.
  - **Recommendation:** Let the later change report success, since the rename's own notice already counted those pages and offers Try Again, and counting them again would mean reading files the rename couldn't read.
- **LC-14 · A Trash Restore Says When It Took a Numbered Name (Change):**
  - **Today:** A property restored from the Trash under a name that's already taken quietly lands as "Priority (2)", and the pane's `+` quietly numbers its default names ("New Select") the same way.
  - **After:** The Trash restore tells you: "Restored “Priority” as “Priority (2)”." The `+` stays quiet, although you confirmed [O-4] that creating a property under a taken name tells you it took a numbered name.
  - **Alternative:** The `+` also shows a notice whenever it numbers its own default name.
  - **Recommendation:** Show the notice only on a Trash restore, since the `+` picks its default name itself and you never asked for a name it could turn down.
- **LC-47 · Both Link Menus Read Rename, Then Edit Link (Change):**
  - **Today:** The two link menus word and order their rows differently: one reads "Edit, Rename", the other "Rename, Edit Title".
  - **After:** Both read Rename, then Edit Link, in the connection menu's order, with one word still different: on a page link in the Properties panel, the row label's menu says Edit Link while the value's own menu says Edit Title for the same action. You confirmed [J-10] that a value's right-click reads the same wherever it opens.
  - **Alternative:** One of the two words is used in both menus.
  - **Recommendation:** Keep Edit Title on the value's menu and Edit Link on the row label's, since the value's menu edits the linked page's title.

#### Open Calls

These have no recommendation strong enough to take in your place.

- **NC-2 · Damaged Settings-File Copies Stay in the Nexus (No Visible Change):**
  - **Today:** When Pommora rebuilds one of its own damaged settings files, it sets the damaged copy aside beside it and never removes it; this holds for every Pommora settings file, outside Properties too.
  - **After:** No change.
  - **Alternative:** Pommora removes the damaged copy at a set moment, such as during the repair itself.
  - **Recommendation:** Keep the copies, since they're evidence for a repair by hand, and a cleanup rule would belong to all of Pommora's settings files at once.

  **Your Answer:** No, it should be cleaned up and done so during whichever time is the most appropriate to do such, potentially during the repair itself. We shouldn’t be leaving broken files in the nexus.

- **NC-3 · Only a Remove Counts Pages It Can't Safely Rewrite as Unfinished (Change):**
  - **Today:** Every change that rewrites many files counts only files it couldn't read as unfinished, so a page it can't safely rewrite (no ID, an ID shared with another page, or properties it can't rewrite safely) quietly keeps the old value.
  - **After:** A Remove counts such a page as unfinished and offers Try Again (LC-19), while a rename, a delete, an option change, and Context and Space changes still don't, so such a page keeps the old name with nothing owed.
  - **Alternative:** Every change counts these pages as unfinished and offers Try Again.
  - **Recommendation:** None; widening it to every change is a behavior change the plan doesn't make without you.

  **Your Answer:** Unsure.

No Last Call is close enough to sit here; each has a clear recommendation below.

#### Behavior Changes to Approve

Each changes something you'd see or something written in your files. Approving them as recommended is the default.

##### Crash Recovery and Big Changes

- **LC-12 · A Big Change That Can't Write Its Crash-Recovery Note Doesn't Start (Fix):**
  - **Today:** Before a change that rewrites many files, Pommora writes a crash-recovery note so a quit halfway can be finished on the next open, but only one note fits at a time. With an earlier change unfinished, option changes refuse, while property renames and deletes run with no note, so a quit halfway leaves pages split between old and new names with nothing to finish them.
  - **After:** Every one of these changes refuses with nothing touched and offers Try Again. Once every item gets its own note (Phase 11A), this only happens when Pommora can't write to the Nexus at all, such as on a full disk.
  - **Recommendation:** Refuse, since a change that can't be finished after a crash shouldn't start; the only other path is today's, which can strand pages.

- **LC-18 · Re-Adding a Removed Property Cancels Its Leftover Cleanup (Change):**
  - **Today:** A Remove that misses pages keeps no record of them, so there's no leftover work to cancel.
  - **After:** If a Remove missed pages and you add the property back to that Collection before Try Again runs, the leftover cleanup for that Collection is dropped, since the property governs those pages again.
  - **Recommendation:** Drop the leftover cleanup when the property returns, so a later Try Again never strips values from a Collection that uses the property again; there's no sensible alternative.
- **LC-19 · A Remove Reports Pages It Can't Clean Up (Fix):**
  - **Today:** A Remove quietly leaves the value on a page with no ID, a page sharing another page's ID, or a page whose properties can't be rewritten safely, while the Collection no longer uses the property.
  - **After:** These pages count as unfinished, with Try Again; a page without an ID usually gets one the next time Pommora reads it, so Try Again usually succeeds.
  - **Recommendation:** Report them with Try Again, so a Remove never leaves values behind without telling you; the only alternative is today's silence.
- **LC-28 · The Hidden Notes File Stays Behind Empty (No Visible Change):**
  - **Today:** The hidden notes file, `.nexus/.owed.json`, doesn't exist yet; this work creates it to hold every crash-recovery note.
  - **After:** After the first big change, the file stays on disk holding nothing (`{}`). It's hidden, never synced, and harmless.
  - **Alternative:** Pommora deletes the file once it empties, which means rebuilding the file-locking piece this work removes.
  - **Recommendation:** Leave the empty file in place, since deleting it safely costs more code than the empty file ever costs you.
- **LC-45 · Clearing an Option Runs While Another Option Change Is Unfinished (Change):**
  - **Today:** Clear is refused while its own property has an unfinished option change.
  - **After:** Clear runs, and any old names still owed to that option switch to "remove", so the unfinished rename can't bring the cleared value back.
  - **Recommendation:** Let Clear run, since switching the owed names to "remove" keeps the cleared value from coming back; the only alternative is today's refusal.
- **LC-49 · A Retried Context Rename Can Leave Leftovers Between Phases 1 and 11A (Change):**
  - **Today:** A Context or Space rename whose Try Again misses files a second time keeps a record of the leftover files, so they're finished later.
  - **After:** Only between Phase 1 and Phase 11A, if that second miss has no earlier record of the rename on file, nothing records the leftover files, so they keep the old name until renamed again. Phase 11A gives each item its own note and closes the gap; every other retry behaves as today.
  - **Alternative:** Keep the old record-keeping alive through those phases, which is code Phase 11A deletes.
  - **Recommendation:** Accept the gap for those phases only, since it closes within this same work and covering it means writing code that's deleted a few phases later.
- **LC-50 · Re-Choosing the Open Nexus No Longer Retries a Context Rename (Change):**
  - **Today:** Picking the Nexus that's already open re-runs an unfinished Context rename.
  - **After:** The rename re-runs only when the Nexus genuinely opens, as unfinished property work already does, and the rename's notice keeps its Try Again.
  - **Recommendation:** Retry only on a real open, so Context and property work follow one rule; the only alternative is today's split.
- **LC-57 · A Damaged Notes File Starts Fresh (Change):**
  - **Today:** The notes file is new to this work; Pommora's other settings files already set a damaged copy aside and start fresh (NC-2).
  - **After:** If `.nexus/.owed.json` is damaged before Pommora reads it, its unfinished work reads as none, and the next note sets the damaged copy aside and starts a new file. Files the lost notes covered keep their old names until changed again.
  - **Recommendation:** Start fresh, as every Pommora settings file does, since the file stays on one device and only an outside edit can damage it.
- **LC-64 · A Stuck Context Rename Offers Try Again (Fix):**
  - **Today:** If a Context rename's folder can't move and putting the old name back also fails, the rename shows the folder's error and leaves the work for the next open.
  - **After:** Since the new name already sits in the Context list, the rename reports "Couldn’t update 1 Item." with Try Again, which moves the folder and updates the pages.
  - **Recommendation:** Offer Try Again, so you can finish the rename without reopening the Nexus.

##### Values and Tidy-Ups

- **LC-20 · Several-Word Selects Written Elsewhere Are Tidied at the Next Open (Change):**
  - **Today:** A Select or Status that Obsidian or another app wrote with several words stays as written when the Nexus opens.
  - **After:** With your tidy rule and Repair Properties On Open both on, it becomes the one option Pommora shows the next time the Nexus opens, and that change syncs. NexusOS has none today, and Phase 4B lists any it finds before changing them.
  - **Recommendation:** Tidy them at the next open, since that's what your two rulings say together.
- **LC-21 · A Several-Word Select Tidies When Any Value on Its Page Changes (Change):**
  - **Today:** Editing another property on the page leaves a several-word Select as written.
  - **After:** It tidies to the one option shown when any property, tag, or Space link on its page changes, and at Repair On Open, the same moments every other tidy-up happens; editing the page's text, title, or banner doesn't tidy it.
  - **Alternative:** Text, title, and banner edits tidy it too.
  - **Recommendation:** Tidy it on value edits only, so it follows the same moments as every other tidy-up.
- **LC-22 · A Multi-Select's Repeated Words Collapse on Any Edit (Fix):**
  - **Today:** `[a, zeta, a]` stays as written when another property is edited, while picking that Multi-Select writes `[a, zeta]`.
  - **After:** It becomes `[a, zeta]` either way, with its options ahead of the words no option names, as a pick writes them. NexusOS holds no such value, and Phase 4B stops for your call if one appears.
  - **Recommendation:** Use the pick's rule at both moments, so one value never has two outcomes.
- **LC-23 · A File Listed Twice Collapses (Fix):**
  - **Today:** Every other list type drops a repeated item on the next edit, but a File value keeps its duplicate.
  - **After:** A File value drops a repeated file on the next edit too.
  - **Recommendation:** Match the other list types.
- **LC-24 · Only Spaces Reads as Empty for Every Type (Fix):**
  - **Today:** You ruled that text holding only spaces is empty, but a date, link, or file written as only spaces still reads as filled.
  - **After:** A value of only spaces reads as empty for every type, stated once.
  - **Recommendation:** Use the one rule for every type, since the reason behind your ruling applies to all of them.
- **LC-25 · An Edit That Changes Nothing Leaves the File Alone (Fix):**
  - **Today:** Re-picking a value a Space already holds rewrites its settings file and gives it a new modified time; pages already skip this.
  - **After:** It writes nothing, and undoing a change that changed nothing writes nothing either.
  - **Recommendation:** Write nothing, so a file only gets a new modified time when something in it actually changed.
- **LC-51 · Picking an Option Deleted Meanwhile Writes Nothing (Fix):**
  - **Today:** If a picker is open while another device deletes one of its options, or a new page inherits an option a sync just removed, picking it writes the deleted word, which a Multi-Select then re-adopts as a brand-new option.
  - **After:** The pick writes nothing for that option.
  - **Recommendation:** Write nothing, so a deleted option can't sneak back in.
- **LC-52 · A Title Sorts and Filters on the Text It Shows (Change):**
  - **Today:** A page title holding `[[…]]` or `](…)` sorts and filters on the raw file name, while a Text value already uses the text it displays.
  - **After:** The title sorts and filters on the text it displays; a file name seldom holds either.
  - **Recommendation:** Match how Text values already sort and filter.
- **LC-61 · A Hand-Copied Option Keeps Its Place (No Visible Change):**
  - **Today:** If you or an agent copy an option in `properties.json` by hand and give the copy a new name, both options stay in the list.
  - **After:** The same, once options carry ids (Phase 8): a copy that kept the original's id takes an id made from its own name, and pages holding its word keep reading it.
  - **Alternative:** A plain "each id appears once" rule, which drops the copy on every read and erases it from the list at the next option edit.
  - **Recommendation:** Give the copy its own id, since it keeps what today keeps.
- **LC-62 · A Status Chip Keeps Its Icon While You Rename Its Option (Fix):**
  - **Today:** While you type a new name in the option editor, the Status chip falls back to the default icon until the rename is saved.
  - **After:** The chip keeps its group's icon throughout.
  - **Recommendation:** Keep the group's icon; the fallback was an accident.

##### The Stash and the Trash

- **LC-1 · Each Stash Records When Its Property Was Removed (No Visible Change):**
  - **Today:** When you Remove a property from a Collection, its pages' values are kept in a stash (the saved copy of removed values) inside the Collection's settings file, with no date.
  - **After:** Each property's stash gains the day it was removed, so it can age out, written beside the values inside the existing wrapper.
  - **Alternative:** Flatten the wrapper, which would put the date where a page's id belongs.
  - **Recommendation:** Keep the wrapper, with the date beside the values.
- **LC-2 · Deleting a Property Everywhere Leaves Trashed Collections Alone (No Visible Change):**
  - **Today:** Every delete already leaves the Trash alone.
  - **After:** No change; restoring the Collection and the property works in either order, since the Collection comes back still listing the property and the property's restore switches it back on.
  - **Alternative:** Reach into a trashed Collection's settings, which without also touching its pages would make restoring both lose the link between them.
  - **Recommendation:** Leave the Trash alone, so restores in either order keep working.
- **LC-3 · "Cache" Becomes "Stash" Everywhere, on Disk Too (No Visible Change):**
  - **Today:** Everyone calls it the stash, while the code and the settings file call it "cache" (`property_cache`).
  - **After:** Both say stash, and the file key becomes `property_stash`; no Nexus holds a stash yet, so the rename costs nothing.
  - **Alternative:** Rename the code only, which gives one thing two names.
  - **Recommendation:** Rename both, so the stash has one name everywhere.
- **LC-4 · A Restored Collection Can Keep a Deleted Property's Id (No Visible Change):**
  - **Today:** A Collection trashed before its property was deleted comes back still listing that property's id, since deletes leave the Trash alone (LC-2).
  - **After:** No change; the id does nothing on its own and switches the property back on if the property is restored too.
  - **Recommendation:** Leave it, since it's what lets the two restores work in either order; dropping it would break that, so there's no real alternative.
- **LC-5 · A Re-Add That Couldn't Refill Some Pages Offers Try Again (Fix):**
  - **Today:** If re-adding a property can't write some pages, their values wait in the stash and you're never told.
  - **After:** The re-add reports them with Try Again, which refills them from the stash; restoring a deleted property from the Trash re-adds it the same way.
  - **Recommendation:** Report them with Try Again, since the stash now ages out (LC-26) and those values would otherwise be lost without you ever knowing.
- **LC-26 · How the Stash Ages Out (Change):**
  - **Today:** The stash never ages out.
  - **After:** A property restored from the Trash keeps its stash's original removal date, as page history ages trashed pages, and a second Remove into the same stash restarts its clock. Archived pages' stashed values follow History Timeframe rather than Archive History Timeframe, as your C-3 says.
  - **Recommendation:** Use all three rules, since each matches how Pommora already ages page history or what you ruled.
- **LC-36 · A Trashed Page Gets Its Stashed Value Back on a Re-Add (Fix):**
  - **Today:** Re-adding a property refills the Collection's live pages from the stash, but a page sitting in the Trash doesn't get its value.
  - **After:** Re-adding writes a trashed page's stashed value into its Trash copy, so restoring the page brings the value back; only a page trashed from this Collection qualifies.
  - **Recommendation:** Write the value into the Trash copy, so restoring that page later restores its value too.
- **LC-37 · A Partly Recorded Trash Entry Shows a Warning Mark (Change):**
  - **Today:** Pommora notes when a Trash entry was only partly recorded, but nothing on screen shows it.
  - **After:** The entry shows a warning mark, read aloud as "Recorded Partly", and restoring it adds "“Title” was recorded partly, so some of what it held may not come back."
  - **Recommendation:** Show the mark and the line, so you know before and after a restore that something may be missing.
- **LC-46 · An Archive Restore's Notice Keeps Its Try Again (Fix):**
  - **Today:** Restoring from the Archive shows its "some values didn't come back" lines once, inside the Restored notice, which replaces the earlier warning in the same moment and loses that warning's Try Again.
  - **After:** The Restored notice carries the Try Again whenever work is still owed.
  - **Recommendation:** Carry the Try Again on the Restored notice, so you can still finish the owed work.

##### Views, Menus, Pickers, and Editors

- **LC-11 · A Context Property Typed Into the Property List by Hand Is Ignored (No Visible Change):**
  - **Today:** A Context-typed or timestamp property typed into `properties.json` by hand is read in, and four places on screen each filter it out.
  - **After:** It's set aside when the list is read, since Contexts come from the Context list, and the four filters leave.
  - **Recommendation:** Set it aside at reading, so one check replaces four.
- **LC-13 · Deleting Something Nothing Holds Still Asks, Without "0 Items" (Change):**
  - **Today:** Deleting a property or option no page holds asks with "stripped from 0 Items" in its message.
  - **After:** It still asks, without that clause: "It is removed from every collection; a restorable record lands in the nexus’s .trash folder." for a property, and "The option is deleted from the property." for an option.
  - **Recommendation:** Keep asking with the shorter wording, since the delete destroys the definition even when no page holds it.
- **LC-15 · The Panel's File Menu Matches Cards (Change):**
  - **Today:** In the Properties panel, a File value's right-click lacks the Remove every other panel row offers, and the row's label has its own menu with Clear.
  - **After:** The File value's right-click gains Remove and not Clear, matching cards, and the label opens the same menu as its value, so it loses Clear and gains Add File.
  - **Recommendation:** Match cards, as your J-10 asks.
- **LC-16 · Undo Takes Back a Link Value's Alias (Change):**
  - **Today:** Giving a Link value a new display name also gives the linked page that alias, and undo leaves the alias behind.
  - **After:** Undo takes back a Link value's alias, while a link typed inside a Text value keeps the alias its save added.
  - **Recommendation:** Undo only a Link value's alias, as your E-3 says, since a Text value's link adds its alias through the editor's own save, which undo doesn't cover.
- **LC-40 · The Pommora Project's Tile Drops Its "open" and "closed" Collapses (Change):**
  - **Today:** The Pommora Project's tiles file has an "Ideas" view whose collapsed Status groups include the lowercase words "open" and "closed", which match no option.
  - **After:** Its real Status collapses are kept and scoped to Status, and "open" and "closed" are dropped (see *§Your Data*).
  - **Recommendation:** Keep the real collapses and drop the two that match nothing.
- **LC-48 · Small Accidents Fixed Along the Way (Fix):**
  - **Today:** Each of these goes wrong, with what it does after the plan:
    - a Nexus whose unfinished Context rename throws on open doesn't finish opening; it finishes opening;
    - a property delete that can't update a damaged Collection settings file silently skips it; it stays unfinished with Try Again;
    - restores ignore a failure to write a Space's file; they warn;
    - a returning page the restore can't tidy refuses the whole restore; it lands and the warning names it;
    - a page restored into the Trash doesn't take a re-filled link value as a live page does; it takes it;
    - a value picked from a menu after its property was deleted opens a picker on a made-up property; it does nothing;
    - a write for a property deleted a moment earlier vanishes; it reaches the app's own refusal;
    - a hand-written filter rule its type can't answer, such as Greater Than on a Checkbox, matches every page; it sits out;
    - a Link added from a card's Add list doesn't open empty; it opens empty;
    - an open picker stays when its row disappears, and a pane opened from the sidebar's menu stays when that row is redrawn; both close;
    - a Control-click in the panel opens more than the menu; it opens only the menu, as in the table and cards.
  - **After:** Each one behaves as listed above.
  - **Recommendation:** Fix all of them, since each is an accident with no reason to keep it.
- **LC-53 · A Checkbox Keeps Both of Its Readings (No Visible Change):**
  - **Today:** An unchecked box is stored as no value, so "is empty" matches unchecked boxes, while sorting treats it as a value, with ascending putting unchecked first.
  - **After:** No change; it's the one exception to "empty sorts last".
  - **Alternative:** Apply "empty sorts last" to it too, which puts every unchecked page last both ways and makes the sort's direction do nothing.
  - **Recommendation:** Keep both readings, so sorting a Checkbox still does something.
- **LC-54 · Every Picker Opens Fresh per Value (Change):**
  - **Today:** The table opens a fresh picker when you move from one value to another, while Cards and the Properties panel carry the open picker over, and the panel's popover vanishes instead of fading.
  - **After:** Cards and the panel open a fresh picker per value as the table does, a Date or File added from a card's Add list opens as a fresh picker at the same spot, and the panel's popover fades out.
  - **Recommendation:** Behave like the table everywhere, so a picker always belongs to the value it opened for.
- **LC-55 · Every Property Editor Shares One Spacing (Change):**
  - **Today:** The Date editor's rows space at 4px and hiding its Day row leaves an extra gap, while the Number editor's rows that appear and disappear have lost their spacing.
  - **After:** The Date editor's rows space at 8px, the Number editor's revealed rows gain their 8px, and a hidden Day row leaves no gap.
  - **Recommendation:** Use the one 8px spacing, since that's what "every editor shares one layout" [L-1] means.
- **LC-56 · Updates Reach Only the Spaces Pommora Lists (Change):**
  - **Today:** Finding which Spaces hold a property or tag scans every folder, so a Space folder under a Context the Context list doesn't name (only a hand copy makes one) is rewritten too.
  - **After:** It reads Pommora's own list of Spaces, so that stray folder is left alone, a Space sharing another's id is held out as pages already are, and an unreadable Space file counts as unfinished.
  - **Recommendation:** Use Pommora's own list, so updates reach exactly the Spaces Pommora shows.
- **LC-59 · A Date That Moves a Page to Another Group Closes Its Calendar (Fix):**
  - **Today:** In a view grouped by a Date, picking a date that moves the page into another group leaves the calendar open but lost from its place on screen.
  - **After:** The calendar closes, because the row it opened from is redrawn under its new group.
  - **Recommendation:** Close the calendar, since its row is gone from where it opened.
- **LC-60 · An Editor That Gave Way Reopens If Its Property Returns (Change):**
  - **Today:** When a property disappears while its editor is open, the editor shows "Property not found."
  - **After:** The editor gives way to the property list [O-5], and the pane remembers it, so if the property comes back before you open anything else (an undo, a sync, or re-adding it), its editor slides open again; a Remove or Delete made from this pane forgets it.
  - **Recommendation:** Reopen the editor, since the same rule lets a just-created property's editor open the moment the property exists.

#### Already Settled or Invisible

These record your earlier answers or change nothing you see. Nothing needs doing.

- **LC-17 · The Value Picker Creates No Status Options (No Visible Change):**
  - **Today:** The value picker creates Select and Multi-Select options but not Status options.
  - **After:** No change; the reason, that a Status option has to sit in one of its groups, is written beside it.
  - **Recommendation:** Keep it, which your J-8 left to planning.
- **LC-27 · The History Timeframe's Hint Waits for Your Settings Passes (No Visible Change):**
  - **Today:** The History Timeframe's hint describes only file history.
  - **After:** No change for now, although the timeframe also ages the stash (LC-26).
  - **Recommendation:** Leave its wording for your I-076 and I-077 passes.
- **LC-29 · The Notes File Uses Pommora's Usual File Writer (No Visible Change):**
  - **Today:** Every Pommora settings file is written through one shared writer.
  - **After:** The new notes file uses it too.
  - **Recommendation:** Use the shared writer; nothing needs deciding.
- **LC-30 · A Mis-Capitalized Option Word Beside a Valid One Drops (Change):**
  - **Today:** `Stage: [done, Active]`, with the option spelled "Done", stays as written.
  - **After:** It tidies to `[Active]`, while `[done]` alone stays as written.
  - **Recommendation:** Follow your rule that unknown words are ignored.
- **LC-31 · Sync's Tests Stay (No Visible Change):**
  - **Today:** Sync's folder holds a test of an old spelling this work removes.
  - **After:** Sync's folder isn't touched while Sync awaits its rebuild; only its feature document's example is rewritten.
  - **Recommendation:** Leave Sync's folder for its rebuild.
- **LC-32 · The Properties Folder's Background/Screen Split Waits (No Visible Change):**
  - **Today:** The Properties folder mixes the code that runs in the background with the code that draws the screen.
  - **After:** No change here.
  - **Recommendation:** Split it with I-042's folder plan for all of Pommora.
- **LC-33 · One Notes File (No Visible Change):**
  - **Today:** Only one crash-recovery note fits at a time (LC-12).
  - **After:** One file holds every item's note.
  - **Recommendation:** Keep one file, since it never syncs and Pommora reads it once at open.
- **LC-34 · Every Property Change Goes Through the App's One Change Channel (No Visible Change):**
  - **Today:** Property settings are saved five different ways.
  - **After:** They're saved one way.
  - **Recommendation:** Use one way; nothing you see changes.
- **LC-35 · I-035 Stays Open (No Visible Change):**
  - **Today:** Pages already tagged with a new Space or Context name stay unlinked until Pommora re-reads them.
  - **After:** No change; the issue's wording is updated.
  - **Recommendation:** Leave it open, since the fault sits in code this work doesn't touch.
- **LC-38 · New Views (No Visible Change):**
  - **Today:** A new view shows Title only, and properties created later stay hidden in existing views.
  - **After:** No change.
  - **Recommendation:** Keep it.
- **LC-39 · Value-Less Rows (No Visible Change):**
  - **Today:** In a grouped view, pages with no value sit as an unlabeled run at the top or bottom.
  - **After:** No change.
  - **Recommendation:** Keep it.
- **LC-41 · The Link Default (No Visible Change):**
  - **Today:** An unset Link Format reads as Full Link.
  - **After:** No change [I-3].
  - **Recommendation:** Keep it, as you ruled.
- **LC-42 · Several-Word Selects (Change):**
  - **Today:** A Select holding several words stays as written when you edit its page.
  - **After:** Any value edit tidies it to the one option shown (LC-21), your answer.
  - **Recommendation:** As you answered.
- **LC-43 · The Name (No Visible Change):**
  - **Today:** Title, Created, Modified, and Location have no shared name in the code.
  - **After:** Their one shared table is named Filedata, your answer.
  - **Recommendation:** As you answered.
- **LC-44 · Measurement Outcomes (No Visible Change):**
  - **Today:** These speed checks don't exist yet; they're part of this work.
  - **After:** Four speed checks on a large test Nexus decide small things by fixed rules, and any that fails its threshold comes back to you with its numbers.
  - **Recommendation:** Let the rules decide, and review only the checks that fail.

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
